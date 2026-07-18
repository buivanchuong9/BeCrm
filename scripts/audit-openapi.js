'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const document = JSON.parse(readFileSync(join(root, 'docs/openapi.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const failures = [];
const operationIds = new Map();
let operationCount = 0;
let genericSuccessCount = 0;

function visit(value, location) {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) {
    const resolved = value.$ref
      .slice(2)
      .split('/')
      .reduce((current, segment) => current?.[segment], document);
    if (resolved === undefined) failures.push(`${location}: unresolved ref ${value.$ref}`);
  }
  for (const [key, child] of Object.entries(value)) visit(child, `${location}.${key}`);
}

if (document.info.version !== packageJson.version) {
  failures.push(`OpenAPI version ${document.info.version} != package version ${packageJson.version}`);
}

for (const [path, pathItem] of Object.entries(document.paths)) {
  for (const method of methods) {
    const operation = pathItem[method];
    if (!operation) continue;
    operationCount += 1;
    if (!operation.operationId) failures.push(`${method.toUpperCase()} ${path}: missing operationId`);
    const previous = operationIds.get(operation.operationId);
    if (previous) failures.push(`duplicate operationId ${operation.operationId}: ${previous}, ${method.toUpperCase()} ${path}`);
    operationIds.set(operation.operationId, `${method.toUpperCase()} ${path}`);

    const declaredPathParams = new Set(
      [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
        .filter((parameter) => parameter.in === 'path')
        .map((parameter) => parameter.name),
    );
    const actualPathParams = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    for (const parameter of actualPathParams) {
      if (!declaredPathParams.has(parameter)) {
        failures.push(`${method.toUpperCase()} ${path}: undocumented path parameter ${parameter}`);
      }
    }

    for (const status of ['400', '401', '403', '404', '409', '413', '429', '500']) {
      if (!operation.responses?.[status]) {
        failures.push(`${method.toUpperCase()} ${path}: missing standard ${status} response`);
      }
    }
    if (operation['x-success-schema'] === 'generic-fallback') genericSuccessCount += 1;
  }
}

const registration = document.components?.schemas?.CreateAccountRequest;
if (!registration?.properties?.displayName || !registration?.properties?.name?.deprecated) {
  failures.push('CreateAccountRequest must expose displayName and deprecated name alias');
}
const registrationOperation = document.paths?.['/api/v1/auth/registrations']?.post;
if (!registrationOperation?.responses?.['201']?.content?.['application/json']?.schema) {
  failures.push('registration 201 response schema is missing');
}

visit(document, 'openapi');

console.log(
  JSON.stringify(
    {
      version: document.info.version,
      paths: Object.keys(document.paths).length,
      operations: operationCount,
      duplicateOperationIds: failures.filter((item) => item.startsWith('duplicate operationId')).length,
      unresolvedReferences: failures.filter((item) => item.includes('unresolved ref')).length,
      genericSuccessSchemas: genericSuccessCount,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exitCode = 1;

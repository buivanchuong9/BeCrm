/** Public policy surface for modules that need patient-scope authorization
 * helpers without reaching into PatientsModule's private policies folder. */
export {
  isSuperAdministrator,
  viewOrgWideOrganizationIds,
} from './policies/patient-policies';

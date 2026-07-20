import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assertAdvanceTransitionAllowed,
  assertConfirmable,
  confirmVersionIncrement,
  isAutomationEligible,
} from '../src/modules/care-plans/domain/policies/follow-up-activity-policies';

describe('follow-up-activity-policies', () => {
  describe('assertAdvanceTransitionAllowed', () => {
    it('allows scheduled -> due', () => {
      assert.doesNotThrow(() => assertAdvanceTransitionAllowed('scheduled', 'due'));
    });
    it('allows due -> completed', () => {
      assert.doesNotThrow(() => assertAdvanceTransitionAllowed('due', 'completed'));
    });
    it('allows escalated -> cancelled', () => {
      assert.doesNotThrow(() => assertAdvanceTransitionAllowed('escalated', 'cancelled'));
    });
    it('rejects completed -> due (terminal state)', () => {
      assert.throws(
        () => assertAdvanceTransitionAllowed('completed', 'due'),
        /INVALID_STATE_TRANSITION|completed cannot transition to due/,
      );
    });
    it('rejects scheduled -> completed (must pass through due)', () => {
      assert.throws(() => assertAdvanceTransitionAllowed('scheduled', 'completed'));
    });
  });

  describe('assertConfirmable', () => {
    it('allows scheduled', () => assert.doesNotThrow(() => assertConfirmable('scheduled')));
    it('allows due', () => assert.doesNotThrow(() => assertConfirmable('due')));
    it('rejects completed', () => assert.throws(() => assertConfirmable('completed')));
    it('rejects escalated', () => assert.throws(() => assertConfirmable('escalated')));
  });

  describe('confirmVersionIncrement', () => {
    it('increments by 2 from scheduled (skips the unrecorded due transition)', () => {
      assert.equal(confirmVersionIncrement('scheduled'), 2);
    });
    it('increments by 1 from due', () => {
      assert.equal(confirmVersionIncrement('due'), 1);
    });
  });

  describe('isAutomationEligible', () => {
    it('accepts medication_reminder', () => assert.equal(isAutomationEligible('medication_reminder'), true));
    it('accepts adherence_check', () => assert.equal(isAutomationEligible('adherence_check'), true));
    it('rejects an arbitrary/unlisted type', () => assert.equal(isAutomationEligible('custom_task'), false));
  });
});

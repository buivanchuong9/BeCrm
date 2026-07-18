/** Public patient self-registration — docs/api.md's original design proposed
 * this only as staff invitation; a public self-service path is added here
 * per product direction. Every field the server derives (organizationId
 * membership role, account status, patient code) is still never accepted
 * from the client beyond picking which organization to register with. */
export interface RegisterPatientRequest {
  email: string;
  password: string;
  displayName: string;
  dob: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  phone: string;
  address?: string;
  organizationId?: string;
  organizationCode?: string;
}

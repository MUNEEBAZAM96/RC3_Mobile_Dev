/** When true, Settings always shows household member management (demo operator). */
export function isHouseholdAdminEnvEnabled(): boolean {
  return process.env.EXPO_PUBLIC_HOUSEHOLD_ADMIN === 'true';
}

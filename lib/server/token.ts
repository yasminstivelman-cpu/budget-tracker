export function isValidContributorToken(token: string | undefined): boolean {
  if (!token || !process.env.CONTRIBUTOR_TOKEN) return false;
  return token === process.env.CONTRIBUTOR_TOKEN;
}

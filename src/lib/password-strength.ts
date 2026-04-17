export function passwordStrength(pwd: string): 1 | 2 | 3 {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  return score <= 1 ? 1 : score === 2 ? 2 : 3;
}

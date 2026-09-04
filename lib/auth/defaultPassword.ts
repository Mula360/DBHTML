/**
 * Default password rule for newly added EC members: the last 4 digits of
 * their phone number followed by their last name (Titlecase), e.g.
 * phone "+91 98765 43210", name "Anita Rao" -> "3210Rao".
 * Members are told to change this the first time they sign in.
 */
export function defaultPassword(name: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last4 = digits.slice(-4).padStart(4, "0");
  const lastName = name.trim().split(/\s+/).pop() ?? "";
  const titled =
    lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
  return `${last4}${titled}`;
}

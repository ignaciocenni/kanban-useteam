export function getClientId(): string {
  let id = sessionStorage.getItem('client-id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('client-id', id);
  }
  return id;
}


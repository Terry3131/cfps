export function unwrapResponse(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;

  if (res?.data?.data !== undefined && res?.data?.data !== null) {
    return res.data.data;
  }

  if (res?.data !== undefined && res?.data !== null) {
    return res.data;
  }

  return null;
}
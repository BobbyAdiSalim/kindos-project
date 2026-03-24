export const createMockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  auth: {},
  ...overrides,
});

export const createMockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

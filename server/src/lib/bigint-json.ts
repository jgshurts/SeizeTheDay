// Prisma returns BigInt for our `id` columns, but JSON.stringify can't
// serialize BigInt natively. Rendering ids as strings keeps them precise
// over the wire instead of silently coercing to Number.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

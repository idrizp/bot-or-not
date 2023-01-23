export const generateInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min)) + min;

export const pickEither = <T>(a: T, b: T) => (Math.random() > 0.5 ? a : b);

import { BinaryGF } from "./BinaryGF";

/**
 * This class represents a polynomial whose coefficients are elements of a binary Galois field.
 *
 * @export
 * @class BinaryGFPoly
 */
export class BinaryGFPoly {
    private field: BinaryGF;
    private coefficients: Uint8ClampedArray;

    /**
     * Creates a polynomial whose coefficients are elements of the given BinaryGF.
     *
     * @param {BinaryGF} field - BinaryGF the coefficients belong to.
     * @param {Uint8ClampedArray} coefficients - polynomial coefficients.
     * @throws Will throw an error if the given polynomial is empty.
     */
    public constructor(field: BinaryGF, coefficients: Uint8ClampedArray) {
        if (coefficients.length === 0) {
            throw new Error("Polynomial is empty!");
        }

        this.field = field;
        // Get leading term: highest degree element with non-zero coefficient,
        // or constant term if all others are zeroes.
        let leading = 0;
        while (leading < coefficients.length - 1 && coefficients[leading] === 0) {
            leading++;
        }
        this.coefficients = coefficients.slice(leading);
    }

    /**
     * Returns the degree of the instance's polynomial.
     *
     * @returns {number}
     */
    public getDegree(): number {
        return this.coefficients.length - 1;
    }

    /**
     * Returns the coefficients of the instance's polynomial, from highest degree to lowest.
     *
     * @returns {Uint8ClampedArray}
     */
    public getCoefficients(): Uint8ClampedArray {
        return this.coefficients;
    }

    /**
     * Returns the coefficient of x^degree in the intance's polynomial.
     *
     * @param {number} degree
     * @returns {number}
     * @throws Will throw an error if degree is outside the range of the polynomial's degree.
     */
    public getCoefficient(degree: number): number {
        if (degree < 0 || degree >= this.coefficients.length) {
            throw new Error("Degree must be between 0 and the polynomial's degree!");
        }

        return this.coefficients[this.coefficients.length - 1 - degree];
    }

    /**
     * Evaluates the polynomial at a given value of x.
     * Uses Horner's method to avoid calculating powers of x.
     *
     * @see [Wikipedia's page]{@link https://en.wikipedia.org/wiki/Horner%27s_method} for more info.
     * @param {number} x - The value at which the polynomial is evaluated.
     * @returns {number} The value of the polynomial at given x.
     */
    public evaluateAt(x: number): number {
        if (x === 0) {
            return this.getCoefficient(0);
        }

        let res = 0;
        for (const co of this.coefficients) {
            res = this.field.add(co, this.field.multiply(res, x));
        }

        return res;
    }

    /**
     * Adds a BinaryGFPoly of the same field to the instance's polynomial,
     * and returns the result as a new BinaryGFPoly.
     *
     * @param {BinaryGFPoly} other - BinaryGFPoly to be added.
     * @returns {BinaryGFPoly} sum of the two polynomials.
     * @throws Will throw an error if the two polynomials are of different Galois fields.
     */
    public add(other: BinaryGFPoly): BinaryGFPoly {
        if (this.field !== other.field) {
            throw new Error("BinaryGFPolys don't have same BinaryGF field");
        }

        if (this.isZero()) {
            return other;
        }
        if (other.isZero()) {
            return this;
        }

        const resLength = Math.max(this.coefficients.length, other.coefficients.length);
        const resCoefficients = new Uint8ClampedArray(resLength);
        for (let i = 0; i < this.coefficients.length; i++) {
            resCoefficients[i + resLength - this.coefficients.length] = this.field.add(
                resCoefficients[i + resLength - this.coefficients.length], this.coefficients[i],
            );
        }
        for (let i = 0; i < other.coefficients.length; i++) {
            resCoefficients[i + resLength - other.coefficients.length] = this.field.add(
                resCoefficients[i + resLength - other.coefficients.length], other.coefficients[i],
            );
        }

        return new BinaryGFPoly(this.field, resCoefficients);
    }

    /**
     * Multiplies the instance's polynomial by a BinaryGFPoly of the same field,
     * and returns the result as a new BinaryGFPoly.
     *
     * @param {BinaryGFPoly} other - BinaryGFPoly to be multiplied.
     * @returns {BinaryGFPoly} product of the two polynomials.
     * @throws Will throw an error if the two polynomials are of different Galois fields.
     */
    public multiplyPoly(other: BinaryGFPoly): BinaryGFPoly {
        if (this.field !== other.field) {
            throw new Error("BinaryGFPolys don't have same BinaryGF field");
        }

        if (this.isZero() || other.isZero()) {
            return this.field.getZeroPoly();
        }
        if (this.isOne()) {
            return other;
        }
        if (other.isOne()) {
            return this;
        }

        const resLength = this.coefficients.length + other.coefficients.length - 1;
        const resCoefficients = new Uint8ClampedArray(resLength);
        for (let i = 0; i < this.coefficients.length; i++) {
            for (let j = 0; j < other.coefficients.length; j++) {
                const a = this.coefficients[i];
                const b = other.coefficients[j];
                resCoefficients[i + j] = this.field.add(
                    resCoefficients[i + j], this.field.multiply(a, b),
                );
            }
        }

        return new BinaryGFPoly(this.field, resCoefficients);
    }

    /**
     * Multiplies the instance's polynomial by a scalar value,
     * and returns the result as a new BinaryGFPoly.
     *
     * @param {number} scalar - scalar to be multiplied.
     * @returns {BinaryGFPoly} product of the instance's polynomial by scalar.
     */
    public multiplyScalar(x: number): BinaryGFPoly {
        if (x === 0) {
            return this.field.getZeroPoly();
        }
        if (x === 1) {
            return this;
        }

        const resCoefficients = new Uint8ClampedArray(this.coefficients.length);
        for (let i = 0; i < this.coefficients.length; i++) {
            resCoefficients[i] = this.field.multiply(this.coefficients[i], x);
        }

        return new BinaryGFPoly(this.field, resCoefficients);
    }

    /**
     * Divides the instance's polynomial by a BinaryGFPoly of the same field,
     * and returns the result as an array of two BinaryGFPoly elements: quotient and remainder.
     * Uses extended synthetic division.
     *
     * @see [Wikipedia's page]{@link https://en.wikipedia.org/wiki/Synthetic_division}
     * for more info.
     * @param {BinaryGFPoly} other - Divisor.
     * @returns {BinaryGFPoly[]} [quotient, remainder].
     * @throws Will throw an error if the two polynomials are of different Galois fields.
     * @throws Will throw an error in case of division by zero.
     */
    public dividePoly(other: BinaryGFPoly): BinaryGFPoly[] {
        if (this.field !== other.field) {
            throw new Error("BinaryGFPolys don't have same BinaryGF field");
        }
        if (other.isZero()) {
            throw new Error("Division by zero!");
        }

        // A / B:
        // If A === 0: return [0, 0]
        // If B === 1: return [A, 0]
        if (this.isZero() || other.isOne()) {
            return [this, this.field.getZeroPoly()];
        }

        const res = new Uint8ClampedArray(this.coefficients);
        const normalizer = other.coefficients[0];
        for (let i = 0; i < this.coefficients.length - other.coefficients.length + 1; i++) {
            res[i] = this.field.divide(res[i], normalizer);
            const coef = res[i];
            if (coef !== 0) {
                for (let j = 1; j < other.coefficients.length; j++) {
                    res[i + j] = this.field.add(
                        res[i + j],
                        this.field.multiply(coef, other.coefficients[j]),
                    );
                }
            }
        }

        const remainderLength = other.coefficients.length - 1;
        return [
            new BinaryGFPoly(this.field, res.slice(0, -remainderLength)),
            new BinaryGFPoly(this.field, res.slice(-remainderLength)),
        ];
    }

    /**
     * Checks if the instance's polynomial is zero.
     *
     * @returns {boolean} True if the polynomial is zero.
     */
    public isZero(): boolean {
        return this.coefficients[0] === 0;
    }

    /**
     * Checks if the instance's polynomial is one.
     *
     * @returns {boolean} True if the polynomial is one.
     */
    public isOne(): boolean {
        return this.coefficients.length === 1 && this.coefficients[0] === 1;
    }
}

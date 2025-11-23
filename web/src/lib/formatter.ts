// formatter.ts

/**
 * Options for formatting a number.
 */
export interface FormatterOptions {
  /** The number of decimal places to display. Defaults to 2. */
  decimalPlaces?: number;
  /** The character to use as the decimal separator. Defaults to '.' */
  decimalSeparator?: string;
  /** The character to use as the thousands separator. Defaults to ',' */
  thousandsSeparator?: string;
}

/**
 * Options for formatting a percentage.
 */
export interface PercentageFormatterOptions extends FormatterOptions {
  /** Whether to append the '%' symbol. Defaults to true. */
  showSymbol?: boolean;
}

/**
 * Options for formatting currency.
 */
export interface CurrencyFormatterOptions extends FormatterOptions {
  /** The currency symbol to prepend. Defaults to '$'. */
  symbol?: string;
  decimals?: number;
}

/**
 * Formats a number with specified decimal places and separators.
 * This is the core, reusable formatter.
 *
 * @param number The number to format.
 * @param options The formatting options.
 * @returns The formatted number as a string.
 */
export function formatNumber(number: number, options: FormatterOptions = {}): string {
  // Set default values for options
  const {
    decimalPlaces = 2,
    decimalSeparator = '.',
    thousandsSeparator = ',',
  } = options;

  // Handle invalid numbers
  if (isNaN(number) || !isFinite(number)) {
    return '';
  }

  // Round the number and fix it to the desired decimal places
  const fixedNumber = number.toFixed(decimalPlaces);

  // Split the number into integer and decimal parts
  let [integerPart, decimalPart] = fixedNumber.split('.');

  // Add thousands separator to the integer part using a regex
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  // If decimalPlaces is 0, toFixed() might not return a decimal part.
  if (decimalPlaces === 0) {
    return integerPart;
  }

  return `${integerPart}${decimalSeparator}${decimalPart}`;
}

/**
 * Formats a decimal number (e.g., 0.25) into a percentage string (e.g., "25.00%").
 * This function handles the "multiply by 100" logic for you.
 *
 * @param decimalValue The decimal value to format (e.g., 0.2534).
 * @param options The formatting options.
 * @returns The formatted percentage string.
 */
export function formatPercentage(
  decimalValue: number,
  options: PercentageFormatterOptions = {}
): string {
  const { showSymbol = true, ...formatterOptions } = options;

  // Multiply by 100 to get the percentage value
  const percentageValue = decimalValue * 100;

  const formattedNumber = formatNumber(percentageValue, formatterOptions);

  return showSymbol ? `${formattedNumber}%` : formattedNumber;
}

/**
 * Formats a number representing cents (e.g., 1250) into a currency string (e.g., "$12.50").
 * This function handles the "divide by 100" logic for you.
 *
 * @param amountInCents The amount in the smallest currency unit (e.g., cents).
 * @param options The formatting options.
 * @returns The formatted currency string.
 */
export function formatCurrency(
  amountInDollars: number,
  options: CurrencyFormatterOptions = {}
): string {
  const { symbol = '฿', decimals = 2, ...formatterOptions } = options;

  // Divide by 100 to get the main currency value
  // const amountInDollars = amountInCents / 100;

  const formattedNumber = formatNumber(Number(amountInDollars), formatterOptions);

  return `${symbol}${formattedNumber}`;
}
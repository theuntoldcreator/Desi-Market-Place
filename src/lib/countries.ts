export interface Country {
  name: string;
  dial_code: string;
  code: string;
}

export const countries: Country[] = [
  { name: 'United States', dial_code: '+1', code: 'US' },
  { name: 'India', dial_code: '+91', code: 'IN' },
  { name: 'United Kingdom', dial_code: '+44', code: 'GB' },
  { name: 'Canada', dial_code: '+1', code: 'CA' },
  { name: 'Australia', dial_code: '+61', code: 'AU' },
  { name: 'Pakistan', dial_code: '+92', code: 'PK' },
  { name: 'Bangladesh', dial_code: '+880', code: 'BD' },
  { name: 'Sri Lanka', dial_code: '+94', code: 'LK' },
  { name: 'Nepal', dial_code: '+977', code: 'NP' },
];
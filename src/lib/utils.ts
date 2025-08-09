import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { countries } from '@/lib/countries'; // Import countries

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to parse phone number into country code and local number
export const parsePhoneNumber = (fullNumber: string | null | undefined) => {
  if (!fullNumber) return { countryCode: '+1', localNumber: '' };
  
  const sortedCountries = [...countries].sort((a, b) => b.dial_code.length - a.dial_code.length);
  let foundCountry = sortedCountries.find(c => fullNumber.startsWith(c.dial_code));
  
  if (foundCountry) {
    return {
      countryCode: foundCountry.dial_code,
      localNumber: fullNumber.substring(foundCountry.dial_code.length),
    };
  }
  return { countryCode: '+1', localNumber: fullNumber }; // Default to +1 if no match
};
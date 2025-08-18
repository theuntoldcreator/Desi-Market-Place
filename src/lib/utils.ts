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

// New function for image optimization
export const transformSupabaseUrl = (
  url: string,
  options: { width: number; height: number; resize?: 'cover' | 'contain' | 'fill'; quality?: number }
): string => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    if (urlObj.pathname.includes('/object/public/')) {
      const transformedPath = urlObj.pathname.replace('/object/public/', '/render/image/public/');
      const params = new URLSearchParams({
        width: String(options.width),
        height: String(options.height),
        resize: options.resize || 'cover',
        quality: String(options.quality || 65),
      });
      return `${urlObj.origin}${transformedPath}?${params.toString()}`;
    }
    return url;
  } catch (error) {
    console.error("Invalid URL for transformation:", url, error);
    return url;
  }
};
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countries, Country } from '@/lib/countries';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PhoneNumberInput({ value, onChange, disabled }: PhoneNumberInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Default to US
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    // Initialize with default country dial code
    onChange(selectedCountry.dial_code);
  }, []);

  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      onChange(`${country.dial_code}${phoneNumber}`);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setPhoneNumber(number);
    onChange(`${selectedCountry.dial_code}${number}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={handleCountryChange} defaultValue={selectedCountry.code} disabled={disabled}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          {countries.map(country => (
            <SelectItem key={country.code} value={country.code}>
              {country.code} ({country.dial_code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        placeholder="Phone number"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        disabled={disabled}
      />
    </div>
  );
}
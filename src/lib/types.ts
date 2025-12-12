export interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
  imageUrl?: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  facility: string;
  imageUrl?: string;
  pets: Pet[];
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
}

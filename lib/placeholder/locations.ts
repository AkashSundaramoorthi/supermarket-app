export type Location = { id: string; label: string; address: string };

export const locations: Location[] = [
  { id: "home-1", label: "Home", address: "Flat 402, Green Meadows, 5th Main Road" },
  { id: "office-1", label: "Office", address: "Tech Park Tower B, 3rd Floor, Sector 4" },
  { id: "res-apt", label: "Sunrise Residency", address: "Tower 2, Apt 11B, Sunrise Residency" },
  { id: "villa", label: "Palm Grove Villa", address: "Villa #14, Palm Grove Enclave, Ring Road" },
  { id: "city-apt", label: "Silver Oak Heights", address: "Flat 204, Silver Oak Heights, 2nd Cross" },
];

export const CURRENT_LOCATION_ID = "current";

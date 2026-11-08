export type Location = { id: string; label: string; address: string };

export const locations: Location[] = [
  { id: "hostel-b", label: "Hostel B", address: "Hostel B, College Road" },
  { id: "library", label: "Library", address: "Central library, College Road" },
  { id: "eng-block", label: "Engineering block", address: "Engineering block, College Road" },
  { id: "sports", label: "Sports complex", address: "Sports complex, College Road" },
  { id: "pg-north", label: "PG North", address: "PG North, Sector 5" },
];

export const CURRENT_LOCATION_ID = "current";

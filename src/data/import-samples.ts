// Embedded sample export files so the import wizard can be tried end-to-end
// without a real upload. Each contains a mix of clean rows, warning rows
// (bad email / unparseable date) and error rows (missing required values) so
// the validation step has something to report.

export interface ImportSample {
  fileName: string;
  content: string;
}

const MOEGO = `Customer Name,Email,Phone,Address,Pet Name,Pet Type,Breed,Weight,Grooming Notes,Service,Appointment Date,Groomer,Status,Price
Sarah Mitchell,sarah.m@example.com,555-0101,12 Oak St,Bella,Dog,Poodle,18,Sensitive skin,Full Groom,2026-06-10,Tina,Completed,75
James Carter,james.c@example.com,555-0102,8 Pine Ave,Max,Dog,Labrador,65,,Bath & Brush,2026-06-12,Tina,Completed,45
Emily Stone,emily.stone@example.com,555-0103,5 Birch Rd,Coco,Cat,Persian,9,Matted fur,De-shed,2026-06-13,Raj,Completed,55
Michael Reed,michael.reed@example.com,555-0104,77 Cedar Ln,Rocky,Dog,Boxer,55,,Nail Trim,2026-06-15,Tina,Confirmed,20
Olivia Brooks,not-an-email,555-0105,3 Maple Ct,Luna,Dog,Husky,48,Anxious,Full Groom,2026-06-16,Raj,Confirmed,80
David Nguyen,david.n@example.com,555-0106,19 Elm St,Charlie,Dog,Beagle,24,,Bath & Brush,2026-06-18,Tina,Confirmed,45
Hannah Lee,,555-0107,42 Walnut Ave,Milo,Cat,Siamese,8,,De-shed,2026-06-19,Raj,Confirmed,55
Robert King,robert.k@example.com,555-0108,6 Spruce Dr,,Dog,Poodle,16,Puppy cut,Full Groom,2026-06-20,Tina,Confirmed,75
Sophia Turner,sophia.t@example.com,555-0109,21 Ash Blvd,Daisy,Dog,Corgi,28,,Nail Trim,not a date,Raj,Confirmed,20
Daniel Foster,daniel.f@example.com,555-0110,9 Willow Way,Rex,Dog,Shepherd,70,Large breed,Full Groom,2026-06-22,Tina,Confirmed,90
Grace Adams,grace.a@example.com,555-0111,14 Poplar St,Mittens,Cat,Maine Coon,12,,De-shed,2026-06-23,Raj,Confirmed,55
Henry Ward,henry.w@example.com,555-0112,30 Beech Rd,Buddy,Dog,Golden,62,Friendly,Bath & Brush,2026-06-24,Tina,Confirmed,45`;

const GINGR = `Owner Name,Owner Email,Owner Phone,Owner Address,Animal Name,Animal Type,Breed,Weight (lbs),Notes,Reservation Type,Check In Date,Staff,Reservation Status,Total
Alice Monroe,alice.m@example.com,555-0201,4 River Rd,Shadow,Dog,Rottweiler,80,Crate trained,Boarding,2026-06-10,Kim,Checked Out,120
Brian Hall,brian.h@example.com,555-0202,18 Lake Dr,Pepper,Dog,Dalmatian,52,,Daycare,2026-06-11,Kim,Checked Out,40
Carla Diaz,carla.d@example.com,555-0203,7 Hill St,Whiskers,Cat,Bengal,11,Shy,Boarding,2026-06-12,Lee,Confirmed,100
Derek Owens,derek.o@example.com,555-0204,25 Vale Ave,Bruno,Dog,Mastiff,95,Large,Boarding,2026-06-13,Kim,Confirmed,140
Fiona Pratt,bademail.com,555-0205,2 Glen Ct,Tigger,Cat,Tabby,10,,Daycare,2026-06-14,Lee,Confirmed,40
Greg Sanders,greg.s@example.com,555-0206,11 Ridge Rd,Zeus,Dog,Doberman,75,,Boarding,2026-06-15,Kim,Confirmed,120
Holly Reed,,555-0207,33 Dale St,Ginger,Dog,Spaniel,30,Friendly,Daycare,2026-06-16,Lee,Confirmed,40
Ian Brooks,ian.b@example.com,555-0208,9 Crest Ave,,Dog,Terrier,18,,Boarding,2026-06-17,Kim,Confirmed,110
Jenna Cole,jenna.c@example.com,555-0209,40 Park Rd,Oreo,Cat,Ragdoll,13,,Daycare,bad-date,Lee,Confirmed,40
Kyle Reed,kyle.r@example.com,555-0210,6 Forest Dr,Bandit,Dog,Collie,45,,Boarding,2026-06-19,Kim,Confirmed,120`;

const GENERIC = `Full Name,E-mail,Cell,Animal,Kind,Visit,When,Amount
Nina Patel,nina.p@example.com,555-0301,Simba,Dog,Grooming,2026-06-10,60
Owen Clark,owen.c@example.com,555-0302,Nala,Cat,Boarding,2026-06-11,90
Paula Vega,paula.v@example.com,555-0303,Rocky,Dog,Daycare,2026-06-12,40
Quinn Ross,quinn.r@example.com,555-0304,Bella,Dog,Grooming,2026-06-13,60`;

export const IMPORT_SAMPLES: Record<string, ImportSample> = {
  moego: { fileName: "moego-export.csv", content: MOEGO },
  gingr: { fileName: "gingr-export.csv", content: GINGR },
  default: { fileName: "sample-export.csv", content: GENERIC },
};

export function getImportSample(sourceId: string): ImportSample {
  return IMPORT_SAMPLES[sourceId] ?? IMPORT_SAMPLES.default;
}

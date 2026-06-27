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

const PAWPARTNER = `Client Name,Client Email,Client Phone,Client Address,Pet Name,Species,Breed,Weight,Pet Notes,Appointment Type,Scheduled Date,Specialist,Appointment Status,Amount Due
Aaron Blake,aaron.b@example.com,555-0401,10 Bay St,Rex,Dog,Boxer,55,Friendly,Full Groom,2026-06-10,Nadia,Completed,70
Bella Cruz,bella.c@example.com,555-0402,22 Cove Rd,Mochi,Cat,Persian,9,Matted,De-shed,2026-06-11,Owen,Completed,55
Caleb Dunn,caleb.d@example.com,555-0403,5 Dock Ln,Scout,Dog,Beagle,24,,Bath & Brush,2026-06-12,Nadia,Confirmed,45
Dana Ellis,dana.ellis.example.com,555-0404,8 Esp Ave,Pixie,Dog,Poodle,16,Puppy cut,Full Groom,2026-06-13,Owen,Confirmed,70
Evan Frost,evan.f@example.com,555-0405,3 Fair Rd,Tank,Dog,Bulldog,50,,Nail Trim,2026-06-14,Nadia,Confirmed,20
Gina Howe,gina.h@example.com,555-0406,7 Gale St,,Dog,Husky,48,Anxious,Full Groom,2026-06-15,Owen,Confirmed,80
Hugo Iyer,hugo.i@example.com,555-0407,9 Harbor Dr,Luna,Cat,Siamese,8,,De-shed,2026-06-16,Nadia,Confirmed,55
Iris Jones,,555-0408,4 Inlet Ct,Bear,Dog,Shepherd,72,Large,Full Groom,2026-06-17,Owen,Confirmed,90
Jack Knox,jack.k@example.com,555-0409,2 Jetty Rd,Ziggy,Dog,Corgi,28,,Bath & Brush,not-a-date,Nadia,Confirmed,45
Kira Lowe,kira.l@example.com,555-0410,6 Key Ave,Misty,Cat,Ragdoll,12,,De-shed,2026-06-19,Owen,Confirmed,55`;

const PROPETWARE = `Owner Full Name,Owner Email,Owner Mobile,Owner Address,Animal Name,Animal Species,Breed,Weight (kg),Care Notes,Reservation Type,Arrival Date,Assigned Staff,Reservation Status,Rate
Liam Park,liam.p@example.com,555-0501,12 North Rd,Shadow,Dog,Rottweiler,36,Crate trained,Boarding,2026-06-10,Maya,Checked Out,130
Mia Quinn,mia.q@example.com,555-0502,8 South Ave,Pepper,Dog,Dalmatian,24,,Daycare,2026-06-11,Noah,Checked Out,45
Noah Reyes,noah.r@example.com,555-0503,5 East St,Whiskers,Cat,Bengal,5,Shy,Boarding,2026-06-12,Maya,Confirmed,110
Owen Shaw,owen-shaw-example,555-0504,3 West Rd,Bruno,Dog,Mastiff,44,Large,Boarding,2026-06-13,Noah,Confirmed,150
Priya Tan,priya.t@example.com,555-0505,7 Vale Dr,Zeus,Dog,Doberman,34,,Boarding,2026-06-14,Maya,Confirmed,130
Quinn Vale,quinn.v@example.com,555-0506,9 Ridge Rd,,Dog,Spaniel,14,Friendly,Daycare,2026-06-15,Noah,Confirmed,45
Rosa Webb,rosa.w@example.com,555-0507,2 Dale St,Ginger,Dog,Terrier,8,,Daycare,2026-06-16,Maya,Confirmed,45
Sean Yu,,555-0508,4 Crest Ave,Oreo,Cat,Ragdoll,6,,Boarding,2026-06-17,Noah,Confirmed,110
Tara Zane,tara.z@example.com,555-0509,6 Park Rd,Bandit,Dog,Collie,20,,Boarding,bad-date,Maya,Confirmed,130
Umar Ash,umar.a@example.com,555-0510,1 Forest Dr,Cleo,Cat,Sphynx,4,,Daycare,2026-06-19,Noah,Confirmed,45`;

const GENERIC_CSV = `Full Name,E-mail,Cell,Animal,Kind,Breed,Visit,When,Staff,Amount
Nina Patel,nina.p@example.com,555-0301,Simba,Dog,Boxer,Grooming,2026-06-10,Tina,60
Owen Clark,owen.c@example.com,555-0302,Nala,Cat,Bengal,Boarding,2026-06-11,Lee,90
Paula Vega,paula.v@example.com,555-0303,Rocky,Dog,Husky,Daycare,2026-06-12,Kim,40
Quinn Ross,quinn.ross.example.com,555-0304,Bella,Dog,Corgi,Grooming,2026-06-13,Tina,60
Ravi Shah,ravi.s@example.com,555-0305,Coco,Cat,Persian,Boarding,2026-06-14,Lee,90
Sara Lin,sara.l@example.com,555-0306,,Dog,Beagle,Daycare,2026-06-15,Kim,40
Tom Bryant,tom.b@example.com,555-0307,Duke,Dog,Shepherd,Grooming,2026-06-16,Tina,60
Uma Devi,uma.d@example.com,555-0308,Mango,Cat,Tabby,Boarding,not-a-date,Lee,90
Vince Ola,vince.o@example.com,555-0309,Rex,Dog,Boxer,Daycare,2026-06-18,Kim,40
Will Park,,555-0310,Buddy,Dog,Golden,Grooming,2026-06-19,Tina,60`;

export const IMPORT_SAMPLES: Record<string, ImportSample> = {
  moego: { fileName: "moego-export.csv", content: MOEGO },
  gingr: { fileName: "gingr-export.csv", content: GINGR },
  pawpartner: { fileName: "pawpartner-export.csv", content: PAWPARTNER },
  propetware: { fileName: "propetware-export.csv", content: PROPETWARE },
  "generic-csv": { fileName: "generic-export.csv", content: GENERIC_CSV },
  default: { fileName: "sample-export.csv", content: GENERIC_CSV },
};

export function getImportSample(sourceId: string): ImportSample {
  return IMPORT_SAMPLES[sourceId] ?? IMPORT_SAMPLES.default;
}

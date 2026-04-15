export type GoProject = {
  id: string; // uuid
  name: string;
  color_hex: string;
};

export type GoMember = {
  id: string; // uuid
  name: string;
  instrument: string;
  phone: string | null;
};

export type GoGig = {
  id: string; // uuid
  project_id: string; // uuid (fk to go_projects)
  title: string;
  location: string;
  date: string; // timestamptz
  gross_value: number;
  paid: boolean;
};

export type GoLineup = {
  id: string; // uuid
  gig_id: string; // uuid (fk to go_gigs)
  musician_id: string; // uuid (fk to go_members)
  agreed_fee: number;
  is_paid: boolean;
};

// Joined types for easy consumption
export type GigWithProject = GoGig & {
  go_projects: {
    name: string;
    color_hex: string;
  } | null;
};

export type LineupWithMember = GoLineup & {
  go_members: {
    name: string;
    instrument: string;
    phone: string | null;
  } | null;
};

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
  id: string;
  project_id: string;
  title: string;
  location: string;
  date: string; // start time (timestamptz)
  end_time: string | null; // end time (timestamptz)
  gross_value: number;
  paid: boolean;
  bring_sound: boolean;
  sound_cost: number;
  sound_person_id: string | null;
};

export type GoLineup = {
  id: string; // uuid
  gig_id: string; // uuid (fk to go_gigs)
  member_id: string; // uuid (fk to go_members)
  fee_amount: number;
  status: string; // 'pago' | 'pendente' or similar
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

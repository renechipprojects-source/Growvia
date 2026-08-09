export type VehicleStatus = "Active" | "Inactive" | "Maintenance";
export type Vehicle = {
  id: string;
  number: string;
  name: string;
  type?: "Bus" | "Van" | "Mini Bus";
  capacity: number;
  driver?: string;
  route?: string;
  status: VehicleStatus;
  lastService?: string;
  nextService?: string;
};

export type Route = {
  id: string;
  name: string;
  pickupPoints?: string[];
  dropPoints?: string[];
  stops?: string[];
  distanceKm?: number;
  vehicle: string;
  driver: string;
  students: number;
  status: "Active" | "Inactive";
};

export type Driver = {
  id: string;
  name: string;
  employeeId?: string;
  mobile?: string;
  phone?: string;
  license?: string;
  licenseNo?: string;
  licenseExpiry?: string;
  vehicle: string;
  route?: string;
  status: "Active" | "On Leave" | "Inactive";
};

export type Allocation = {
  id: string;
  student?: string;
  studentId?: string;
  studentName?: string;
  className: string;
  section: string;
  route?: string;
  routeName?: string;
  pickupPoint?: string;
  pickupStop?: string;
  dropPoint?: string;
  vehicle?: string;
  driver?: string;
  monthlyFee: number;
  status?: string;
};

export type StudentAllocation = Allocation;

export type Maintenance = {
  id: string;
  vehicle: string;
  serviceDate: string;
  serviceType: string;
  vendor: string;
  cost: number;
  nextServiceDate: string;
  notes: string;
};

export type TransportFee = {
  id: string;
  student: string;
  route: string;
  monthlyFee: number;
  paid: number;
  pending: number;
  status: "Paid" | "Partial" | "Due";
};
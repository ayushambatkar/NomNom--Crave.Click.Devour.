import { User, Address } from '@prisma/client';

export interface GuestAddress {
  latitude: number;
  longitude: number;
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface GuestUser {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  address?: GuestAddress | null;
  phoneNumber?: null; // guests have no phone until upgrade
  email?: null;
  name?: null;
  isGuest: true;
}

export class UserEntity {
  private constructor(
    private readonly props: User & {
      address?: Address;
    },
  ) {}

  static fromPrisma(
    user: User & { address?: Address },
  ) {
    return new UserEntity(user);
  }

  static fromGuest(guest: GuestUser) {
    // Provide a shape compatible with registered user accessors
    return new UserEntity({
      id: guest.id,
      phoneNumber: null,
      addressId: null,
      email: null,
      name: null,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      address: guest.address ?? null,
    } as any);
  }

  get id() {
    return this.props.id;
  }
  get address() {
    return (this.props as any).address ?? null;
  }
  get hasAddress() {
    return !!this.address;
  }
  get isGuest() {
    return (
      this.props.phoneNumber === null &&
      this.props.addressId === null &&
      this.props.email === null
    );
  }
}

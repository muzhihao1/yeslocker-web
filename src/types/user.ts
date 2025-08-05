export interface User {
  id: string
  phone: string
  name: string
  avatarUrl?: string
  storeId: string
  storeName?: string
  lockerId?: string
  lockerNumber?: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt?: string
}

export interface Store {
  id: string
  name: string
  address: string
  adminId?: string
  createdAt: string
}

export interface Locker {
  id: string
  storeId: string
  storeName?: string
  number: string
  status: 'available' | 'occupied' | 'maintenance' | 'approved' | 'pending'
  userId?: string
  createdAt: string
  lastUseTime?: string
}

export interface LockerRecord {
  id: string
  userId: string
  lockerId: string
  lockerNumber: string
  storeId: string
  storeName: string
  actionType: 'store' | 'retrieve'
  createdAt: string
  duration?: number // in minutes
  note?: string
}

export interface LockerApplication {
  id: string
  userId: string
  storeId: string
  lockerId: string
  status: 'pending' | 'approved' | 'rejected'
  appliedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reason?: string
}
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Edit, Trash2 } from "lucide-react";
import NoData from "@/components/NoData";
import { authService } from "@/lib/services/authService";
import { addressService } from "@/lib/services/front-end/addressService";
import AddressForm from "@/components/AddressForm";
import AlertMessage from "@/components/AlertMessage";
import PopupAlert from "@/components/PopupAlert";
import Loader from "@/components/Loader";

export default function AccountDetailsPage() {
  const { data: session, status } = useSession();

  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: number | null }>({
    isOpen: false,
    id: null,
  });
  const [alert, setAlert] = useState<{ isOpen: boolean; type: "success" | "error" | ""; message: string }>({
    isOpen: false,
    type: "",
    message: "",
  });

  //  Load profile & addresses
  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const token = session?.user?.token;

    // Use session user immediately as baseline profile
    if (session?.user) {
      setProfile({
        name: session.user.name,
        email: session.user.email,
        role: { name: (session.user as any).role || "customer" },
      });
    }

    (async () => {
      try {
        const [profileRes, addressesRes] = await Promise.allSettled([
          authService.getProfile(token),
          addressService.getAll(token),
        ]);

        if (isMounted) {
          if (profileRes.status === "fulfilled" && profileRes.value?.user) {
            setProfile(profileRes.value.user);
          }
          if (addressesRes.status === "fulfilled" && Array.isArray(addressesRes.value)) {
            setAddresses(addressesRes.value);
          }
        }
      } catch (err: any) {
        console.error("Failed to load account details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [status, session]);

  //  Add or Update Address
  const handleSaveAddress = async (data: any) => {
    try {
      if (selectedAddress) {
        await addressService.update(session?.user?.token, selectedAddress.id, data);
        setAlert({ isOpen: true, type: "success", message: "Address updated successfully!" });
      } else {
        await addressService.create(session?.user?.token, data);
        setAlert({ isOpen: true, type: "success", message: "Address added successfully!" });
      }
      const updated = await addressService.getAll(session?.user?.token);
      setAddresses(Array.isArray(updated) ? updated : []);
      setIsEditing(false);
      setSelectedAddress(null);
    } catch (err: any) {
      setAlert({ isOpen: true, type: "error", message: err.message || "Failed to save address" });
      throw err;
    }
  };

  // Delete Address
  const handleDeleteAddress = async (id: number) => {
    setDeleteLoading(id);
    try {
      await addressService.remove(session?.user?.token, id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      setAlert({ isOpen: true, type: "success", message: "Address deleted successfully!" });
    } catch (err: any) {
      setAlert({ isOpen: true, type: "error", message: err.message || "Failed to delete address." });
    } finally {
      setDeleteLoading(null);
      setConfirmDelete({ isOpen: false, id: null });
    }
  };

  if (loading && !profile) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0a0808] tracking-tight">
          My Details
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Manage your personal information and saved delivery addresses
        </p>
      </div>

      {alert.isOpen && alert.type && (
        <AlertMessage
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
        />
      )}

      {/* Profile Info */}
      <div className="bg-white border border-[#e8d5c8]/80 p-6 md:p-8 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold text-[#0a0808] mb-4 pb-3 border-b border-gray-100">
          Account Information
        </h2>
        {profile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[var(--text-secondary)]">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Full Name
              </p>
              <p className="font-semibold text-base text-[#0a0808]">{profile.name || "Customer"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
                Email Address
              </p>
              <p className="font-semibold text-base text-[#0a0808]">{profile.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-sm">No profile found.</p>
        )}
      </div>

      {/* Saved Addresses */}
      <div className="bg-white border border-[#e8d5c8]/80 p-6 md:p-8 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#0a0808]">Saved Addresses</h2>
          <button
            onClick={() => {
              setSelectedAddress(null);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 bg-[#b08a78] text-white px-4 py-2 rounded-full font-medium hover:bg-[#967262] transition shadow-sm text-sm"
          >
            <Plus size={16} />
            Add Address
          </button>
        </div>

        <div className="space-y-4">
          {addresses.length > 0 ? (
            addresses.map((address, index) => (
              <div
                key={address.id || index}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-[var(--soft-gray)] rounded-xl hover:border-[#b08a78]/50 transition bg-white gap-4"
              >
                <div>
                  <p className="font-semibold text-[#0a0808]">
                    {address.firstName} {address.lastName}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {address.address1}
                    {address.address2 ? `, ${address.address2}` : ""}, {address.city}, {address.country}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{address.phone}</p>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setSelectedAddress(address);
                      setIsEditing(true);
                    }}
                    className="w-9 h-9 flex items-center justify-center bg-[#e8d5c8]/40 text-[#b08a78] rounded-full hover:bg-[#b08a78] hover:text-white transition"
                    disabled={deleteLoading !== null}
                    title="Edit Address"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ isOpen: true, id: address.id })}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition ${
                      deleteLoading === address.id
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                    }`}
                    disabled={deleteLoading !== null}
                    title="Delete Address"
                  >
                    {deleteLoading === address.id ? (
                      <span className="animate-spin border-2 border-t-transparent border-red-600 rounded-full w-4 h-4"></span>
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <NoData message="You have no saved addresses." />
          )}
        </div>
      </div>

      {/* Address Modal */}
      {isEditing && (
        <AddressForm
          initialData={selectedAddress}
          onCancel={() => {
            setIsEditing(false);
            setSelectedAddress(null);
          }}
          onSave={handleSaveAddress}
        />
      )}

      {/* Delete Confirmation */}
      {confirmDelete.isOpen && (
        <PopupAlert
          type="warning"
          message="Are you sure you want to delete this address?"
          confirmText={deleteLoading ? "Deleting..." : "Yes, Delete"}
          cancelText="Cancel"
          onConfirm={() => handleDeleteAddress(confirmDelete.id as number)}
          onCancel={() => setConfirmDelete({ isOpen: false, id: null })}
          show={confirmDelete.isOpen}
        />
      )}
    </div>
  );
}

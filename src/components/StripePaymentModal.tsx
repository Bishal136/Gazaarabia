"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { loadStripe, PaymentIntent, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useSession } from "next-auth/react";
import { X, CreditCard, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

import StripeCardForm from "./StripeCardForm";
import { stripeService } from "@/lib/services/front-end/stripeService";

interface StripePaymentModalProps {
    open: boolean;
    onClose: () => void;
    amount: number;
    customerId: string | null;
    onSuccess: (result: PaymentIntent) => void;
}

interface SavedCard {
    id: string;
    card: {
        brand: string;
        last4: number;
        exp_month: number;
        exp_year: number;
    };
}

let stripePromiseCache: Promise<Stripe | null> | null = null;

function getStripePromise(): Promise<Stripe | null> {
    if (!stripePromiseCache) {
        const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
        if (publishableKey) {
            stripePromiseCache = loadStripe(publishableKey);
        }
    }
    return stripePromiseCache || Promise.resolve(null);
}

function resetStripePromise(): Promise<Stripe | null> {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
    if (publishableKey) {
        stripePromiseCache = loadStripe(publishableKey);
    }
    return stripePromiseCache || Promise.resolve(null);
}

export default function StripePaymentModal(props: StripePaymentModalProps) {
    if (!props.open) return null;
    return <StripeWrapper {...props} />;
}

function StripeWrapper({
    open,
    onClose,
    amount,
    customerId,
    onSuccess,
}: StripePaymentModalProps) {
    const { data: session, update } = useSession();
    const token = session?.user?.token ?? null;

    const [finalCustomerId, setFinalCustomerId] = useState(customerId);
    const [clientSecret, setClientSecret] = useState("");
    const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
    const [selectedCard, setSelectedCard] = useState("new");

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stripeInstance, setStripeInstance] = useState<Promise<Stripe | null>>(getStripePromise);

    const elementsOptions = useMemo(() => ({ clientSecret }), [clientSecret]);
    const isGuest = !session?.user;

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") onClose();
            };
            window.addEventListener("keydown", handleKeyDown);
            return () => {
                document.body.style.overflow = "";
                window.removeEventListener("keydown", handleKeyDown);
            };
        } else {
            document.body.style.overflow = "";
        }
    }, [open, onClose]);

    // 1) Ensure customer exists if logged in (non-blocking)
    useEffect(() => {
        let isMounted = true;
        const ensureCustomer = async () => {
            if (!token || finalCustomerId) return;
            try {
                const res = await stripeService.createCustomer(token);
                if (isMounted && res.customerId) {
                    setFinalCustomerId(res.customerId);
                    await update({
                        user: {
                            ...session?.user,
                            stripeCustomerId: res.customerId,
                        },
                    });
                }
            } catch (err) {
                // Non-critical: payments can proceed as guest or without saved cards
                console.warn("Could not create Stripe customer:", err);
            }
        };

        ensureCustomer();
        return () => {
            isMounted = false;
        };
    }, [token, finalCustomerId]);

    // 2) Initialize PaymentIntent & Saved Cards
    const initPayment = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Check browser offline status
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                setError("You appear to be offline. Please reconnect to the internet and click Retry.");
                setLoading(false);
                return;
            }

            // Load saved payment methods (non-blocking)
            if (token) {
                stripeService.getSavedMethods(token)
                    .then((pmRes) => {
                        if (pmRes?.paymentMethods?.length) {
                            setSavedCards(pmRes.paymentMethods);
                        }
                    })
                    .catch(() => {
                        // ignore saved methods failure
                    });
            }

            // Create PaymentIntent
            const piRes = await stripeService.createPaymentIntent(token, amount);

            if (piRes.error) {
                setError(piRes.error);
            } else if (piRes.clientSecret) {
                setClientSecret(piRes.clientSecret);
                setError(null);
            } else {
                setError("Unable to obtain payment authorization. Please try again.");
            }
        } catch (err: any) {
            console.error("Stripe init error:", err);
            setError(err.message || "Failed to connect to payment server. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [token, amount]);

    useEffect(() => {
        if (!open) return;
        initPayment();
    }, [open, initPayment]);

    // Retry action for connection or Stripe loading issues
    const handleRetry = () => {
        setStripeInstance(resetStripePromise());
        initPayment();
    };

    // 3) Pay with a saved card
    const handleSavedCardPayment = async () => {
        try {
            setProcessing(true);
            setError(null);

            const res = await stripeService.payWithSavedCard(
                token,
                selectedCard,
                amount
            );

            if (res.error) {
                setError(res.error);
                setProcessing(false);
                return;
            }

            onSuccess(res.intent);
            onClose();
        } catch (err: any) {
            console.error("Saved card payment error:", err);
            setError("Payment failed. Please try again or use a different card.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto border border-gray-100">
                {/* Close button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-[#0a0808]">
                        Secure Card Payment
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                        Amount to pay: <span className="font-bold text-[#0a0808]">£{amount.toFixed(2)}</span>
                    </p>
                </div>

                {/* Error Banner with Retry */}
                {error && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm space-y-3">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-900">Payment Connection Error</p>
                                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{error}</p>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-red-100 flex items-center justify-end">
                            <button
                                type="button"
                                onClick={handleRetry}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                            >
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                <span>Try Again</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading state inside modal */}
                {loading && !clientSecret && (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                        <Loader2 size={36} className="text-[#b08a78] animate-spin" />
                        <p className="text-sm font-medium text-gray-600">
                            Connecting to secure payment gateway...
                        </p>
                    </div>
                )}

                {/* Main Content when ready */}
                {!loading && (
                    <div className="space-y-5">
                        {/* Saved cards list */}
                        {!isGuest && savedCards.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                                    Saved Cards
                                </p>
                                <div className="space-y-2">
                                    {savedCards.map((pm) => (
                                        <label
                                            key={pm.id}
                                            className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition ${
                                                selectedCard === pm.id
                                                    ? "border-[#b08a78] bg-[#fdfbf9] shadow-xs"
                                                    : "border-gray-200 hover:border-gray-300 bg-white"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="stripeCardOption"
                                                checked={selectedCard === pm.id}
                                                onChange={() => setSelectedCard(pm.id)}
                                                className="accent-[#b08a78] w-4 h-4 cursor-pointer"
                                            />
                                            <CreditCard size={18} className="text-gray-600 shrink-0" />
                                            <span className="text-sm font-semibold text-[#0a0808]">
                                                {pm.card.brand.toUpperCase()} •••• {pm.card.last4}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-auto">
                                                Exp {pm.card.exp_month}/{pm.card.exp_year}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add new card option */}
                        <div className="space-y-2">
                            {!isGuest && savedCards.length > 0 && (
                                <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                                    Or Pay With New Card
                                </p>
                            )}

                            <label
                                className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition ${
                                    selectedCard === "new"
                                        ? "border-[#b08a78] bg-[#fdfbf9] shadow-xs"
                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="stripeCardOption"
                                    checked={selectedCard === "new"}
                                    onChange={() => setSelectedCard("new")}
                                    className="accent-[#b08a78] w-4 h-4 cursor-pointer"
                                />
                                <CreditCard size={18} className="text-gray-600 shrink-0" />
                                <span className="text-sm font-semibold text-[#0a0808]">
                                    Credit or Debit Card
                                </span>
                            </label>
                        </div>

                        {/* Stripe Card Input Form */}
                        {selectedCard === "new" && clientSecret && (
                            <div className="pt-2 animate-in fade-in duration-200">
                                <Elements key={clientSecret} stripe={stripeInstance} options={elementsOptions}>
                                    <StripeCardForm amount={amount} onSuccess={onSuccess} />
                                </Elements>
                            </div>
                        )}

                        {/* Pay button for saved card */}
                        {selectedCard !== "new" && (
                            <button
                                type="button"
                                className="w-full bg-[#b08a78] hover:bg-[#9d7765] text-white py-3.5 rounded-full font-semibold transition active:scale-[0.99] shadow-sm disabled:opacity-60 cursor-pointer text-sm uppercase tracking-wider"
                                disabled={processing}
                                onClick={handleSavedCardPayment}
                            >
                                {processing ? "Processing..." : `Pay £${amount.toFixed(2)}`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

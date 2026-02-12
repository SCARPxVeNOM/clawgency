import { TransactionLogger } from "@/components/TransactionLogger";

export default function ActivityPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-black">📋 Activity</h1>
                <p className="mt-1 text-sm text-gray-500 font-medium">
                    Track all on-chain transactions and events.
                </p>
            </div>
            <TransactionLogger />
        </div>
    );
}

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { LineItem } from "@/types";
import type { MoneyFormat } from "@/lib/money";
import { formatCurrency } from "@/lib/utils";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  title: { fontSize: 18, marginBottom: 16, fontWeight: "bold" },
  section: { marginBottom: 12 },
  label: { color: "#555", marginBottom: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  totals: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#333" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    fontSize: 12,
    fontWeight: "bold",
  },
});

export type InvoicePdfDocumentProps = {
  businessName: string;
  businessAddressLines: string[];
  invoiceNumber: string;
  clientName: string;
  dueDateLabel: string;
  dueDateFormatted: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  money: MoneyFormat;
  subtotalLabel: string;
  taxLabel: string;
  totalLabel: string;
  lineItemsHeading: string;
  clientHeading: string;
};

export function InvoicePdfDocument({
  businessName,
  businessAddressLines,
  invoiceNumber,
  clientName,
  dueDateLabel,
  dueDateFormatted,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  total,
  money,
  subtotalLabel,
  taxLabel,
  totalLabel,
  lineItemsHeading,
  clientHeading,
}: InvoicePdfDocumentProps) {
  const fmt = (n: number) => formatCurrency(n, money);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{invoiceNumber}</Text>

        <View style={styles.section}>
          <Text style={styles.label}>{businessName}</Text>
          {businessAddressLines.map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{clientHeading}</Text>
          <Text>{clientName}</Text>
        </View>

        <Text style={{ marginBottom: 8, fontWeight: "bold" }}>{lineItemsHeading}</Text>
        {lineItems.map((item) => (
          <View key={item.id} style={styles.lineItem} wrap={false}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text>{item.description}</Text>
              <Text style={{ color: "#666", marginTop: 2 }}>
                {item.quantity} × {fmt(Number(item.unit_price ?? 0))}
              </Text>
            </View>
            <Text>{fmt(Number(item.line_total ?? 0))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>{subtotalLabel}</Text>
            <Text>{fmt(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>
              {taxLabel} ({taxRate}%)
            </Text>
            <Text>{fmt(taxAmount)}</Text>
          </View>
          <View style={styles.grand}>
            <Text>{totalLabel}</Text>
            <Text>{fmt(total)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text>
            {dueDateLabel}: {dueDateFormatted}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

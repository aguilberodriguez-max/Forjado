import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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

export type EstimatePdfDocumentProps = {
  logoUrl?: string | null;
  documentTitle: string;
  businessName: string;
  businessAddressLines: string[];
  estimateNumber: string;
  clientHeading: string;
  clientName: string;
  clientDetailLines: string[];
  lineItemsHeading: string;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  money: MoneyFormat;
  subtotalLabel: string;
  taxLabel: string;
  totalLabel: string;
  validUntilLabel: string;
  validUntilFormatted: string;
  notesLabel: string;
  notes?: string | null;
};

export function EstimatePdfDocument({
  logoUrl,
  documentTitle,
  businessName,
  businessAddressLines,
  estimateNumber,
  clientHeading,
  clientName,
  clientDetailLines,
  lineItemsHeading,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  total,
  money,
  subtotalLabel,
  taxLabel,
  totalLabel,
  validUntilLabel,
  validUntilFormatted,
  notesLabel,
  notes,
}: EstimatePdfDocumentProps) {
  const fmt = (n: number) => formatCurrency(n, money);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{documentTitle}</Text>
        <Text style={{ marginBottom: 12, fontSize: 12, fontWeight: "bold" }}>{estimateNumber}</Text>

        {logoUrl?.trim() ? (
          <Image src={logoUrl} style={{ width: 96, height: 48, marginBottom: 10 }} />
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>{businessName}</Text>
          {businessAddressLines.map((line, i) => (
            <Text key={`addr-${i}`}>{line}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{clientHeading}</Text>
          <Text>{clientName}</Text>
          {clientDetailLines.map((line, i) => (
            <Text key={`client-${i}`} style={{ color: "#333", marginTop: 2 }}>
              {line}
            </Text>
          ))}
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
            {validUntilLabel}: {validUntilFormatted}
          </Text>
        </View>

        {notes?.trim() ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>{notesLabel}</Text>
            <Text>{notes.trim()}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

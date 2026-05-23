// Tax Receipts screen
// Lists past annual giving summaries and lets users generate + download PDFs.

import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import {
  generateReceipt,
  getReceiptDownloadUrl,
  loadReceipts,
  getYearTotal,
  type TaxReceiptRecord,
} from '@/lib/tax-receipts';

const CURRENT_YEAR  = new Date().getFullYear();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;

export default function TaxReceiptsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [receipts, setReceipts] = useState<TaxReceiptRecord[]>([]);
  const [currentYearTotal, setCurrentYearTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null); // receipt id

  useEffect(() => {
    async function load() {
      const [recs, ytd] = await Promise.all([
        loadReceipts(),
        getYearTotal(CURRENT_YEAR),
      ]);
      setReceipts(recs);
      setCurrentYearTotal(ytd);
      setLoading(false);
    }
    load();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generateReceipt(PREVIOUS_YEAR);

      if (result.error === 'no_donations') {
        Alert.alert(
          'No donations yet',
          `You had no completed donations in ${PREVIOUS_YEAR}. Complete your first donation to generate a receipt.`
        );
        setGenerating(false);
        return;
      }

      // Refresh list
      const updated = await loadReceipts();
      setReceipts(updated);

      // Open PDF immediately
      if (result.url) {
        await Linking.openURL(result.url);
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message ?? 'Could not generate receipt.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(receipt: TaxReceiptRecord) {
    setDownloading(receipt.id);
    try {
      const url = await getReceiptDownloadUrl(receipt.pdf_path);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open the receipt. Please try again.');
    } finally {
      setDownloading(null);
    }
  }

  const hasPreviousYearReceipt = receipts.some((r) => r.year === PREVIOUS_YEAR);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]}>Tax Receipts</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 48 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Current year YTD card */}
          <View style={[styles.ytdCard, { backgroundColor: c.primary }]}>
            <Text style={[styles.ytdLabel, { color: c.primaryFixed }]}>{CURRENT_YEAR} Giving (Year to Date)</Text>
            <Text style={[styles.ytdAmount, { color: c.onPrimary }]}>
              ${(currentYearTotal ?? 0).toFixed(2)}
            </Text>
            <Text style={[styles.ytdNote, { color: c.primaryFixed }]}>
              Receipt available after Dec 31, {CURRENT_YEAR}
            </Text>
          </View>

          {/* Generate previous year receipt */}
          {!hasPreviousYearReceipt && (
            <View style={[styles.generateCard, { backgroundColor: c.surfaceWhite }]}>
              <Text style={[styles.generateTitle, { color: c.onSurface }]}>
                {PREVIOUS_YEAR} Annual Receipt
              </Text>
              <Text style={[styles.generateBody, { color: c.textMuted }]}>
                Generate your official {PREVIOUS_YEAR} giving summary for tax filing purposes.
              </Text>
              <Pressable
                style={[styles.generateBtn, { backgroundColor: c.primary, opacity: generating ? 0.7 : 1 }]}
                onPress={handleGenerate}
                disabled={generating}
              >
                {generating
                  ? <ActivityIndicator color={c.onPrimary} />
                  : <Text style={[styles.generateBtnText, { color: c.onPrimary }]}>
                      Generate {PREVIOUS_YEAR} Receipt
                    </Text>
                }
              </Pressable>
            </View>
          )}

          {/* Past receipts */}
          {receipts.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Past Receipts</Text>
              <View style={[styles.receiptList, { backgroundColor: c.surfaceWhite }]}>
                {receipts.map((receipt, idx) => (
                  <View
                    key={receipt.id}
                    style={[
                      styles.receiptRow,
                      idx < receipts.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.outlineVariant },
                    ]}
                  >
                    <View style={[styles.receiptIcon, { backgroundColor: c.secondaryContainer }]}>
                      <Text style={styles.receiptEmoji}>🧾</Text>
                    </View>
                    <View style={styles.receiptInfo}>
                      <Text style={[styles.receiptYear, { color: c.onSurface }]}>
                        {receipt.year} Annual Summary
                      </Text>
                      <Text style={[styles.receiptAmount, { color: c.textMuted }]}>
                        ${receipt.total_donated.toFixed(2)} donated
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.downloadBtn, { borderColor: c.primary }]}
                      onPress={() => handleDownload(receipt)}
                      disabled={downloading === receipt.id}
                    >
                      {downloading === receipt.id
                        ? <ActivityIndicator color={c.primary} size="small" />
                        : <Text style={[styles.downloadBtnText, { color: c.primary }]}>PDF</Text>
                      }
                    </Pressable>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Empty state */}
          {receipts.length === 0 && hasPreviousYearReceipt === false && (
            <View style={[styles.emptyCard, { backgroundColor: c.surfaceWhite }]}>
              <Text style={styles.emptyEmoji}>📄</Text>
              <Text style={[styles.emptyTitle, { color: c.onSurface }]}>No receipts yet</Text>
              <Text style={[styles.emptyBody, { color: c.textMuted }]}>
                Once you complete your first donations, you can generate annual tax receipts here.
              </Text>
            </View>
          )}

          <Text style={[styles.disclaimer, { color: c.textMuted }]}>
            Zaytoon facilitates donations to verified 501(c)(3) organizations. Receipts are generated
            based on completed donations only. Consult a tax advisor for deductibility guidance.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, fontWeight: '500' },
  navTitle: { fontSize: 17, fontWeight: '700' },
  content: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 24,
    paddingBottom: 48,
    gap: DesignSpacing.stackGapMd,
  },

  // YTD hero
  ytdCard: {
    borderRadius: BorderRadius.xxl,
    padding: DesignSpacing.cardPadding,
    gap: 4,
  },
  ytdLabel: { fontSize: 13, fontWeight: '600' },
  ytdAmount: { fontSize: 36, fontWeight: '700', letterSpacing: -1 },
  ytdNote: { fontSize: 12, marginTop: 4 },

  // Generate card
  generateCard: {
    borderRadius: BorderRadius.xxl,
    padding: DesignSpacing.cardPadding,
    gap: 10,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  generateTitle: { fontSize: 16, fontWeight: '700' },
  generateBody: { fontSize: 14, lineHeight: 20 },
  generateBtn: {
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  generateBtnText: { fontSize: 14, fontWeight: '700' },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Receipt list
  receiptList: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: DesignSpacing.cardPadding,
    paddingVertical: 16,
  },
  receiptIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptEmoji: { fontSize: 20 },
  receiptInfo: { flex: 1 },
  receiptYear: { fontSize: 15, fontWeight: '600' },
  receiptAmount: { fontSize: 13, marginTop: 2 },
  downloadBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minWidth: 52,
    alignItems: 'center',
  },
  downloadBtnText: { fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyCard: {
    borderRadius: BorderRadius.xxl,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },

  disclaimer: { fontSize: 11, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },
});

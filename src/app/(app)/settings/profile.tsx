import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      setFullName(profile?.full_name ?? '');
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const initials = fullName
    ? fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]}>Account Information</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 48 }} />
        ) : (
          <View style={styles.content}>
            {/* Avatar */}
            <View style={styles.avatarArea}>
              <View style={[styles.avatar, { backgroundColor: c.secondaryContainer }]}>
                <Text style={[styles.avatarText, { color: c.primary }]}>{initials}</Text>
              </View>
            </View>

            {/* Full name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.onSurface }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceWhite, color: c.onSurface, borderColor: c.outlineVariant }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your full name"
                placeholderTextColor={c.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            {/* Email (read-only) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: c.onSurface }]}>Email Address</Text>
              <View style={[styles.inputReadOnly, { backgroundColor: c.surfaceWhite, borderColor: c.outlineVariant }]}>
                <Text style={[styles.inputReadOnlyText, { color: c.onSurface }]}>{email}</Text>
              </View>
              <Text style={[styles.fieldNote, { color: c.textMuted }]}>
                To change your email address, please contact support.
              </Text>
            </View>

            {/* Save */}
            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: saved ? c.successFresh : c.primary },
                saving && { opacity: 0.7 },
              ]}
              onPress={handleSave}
              disabled={saving || !fullName.trim()}
            >
              {saving
                ? <ActivityIndicator color={c.onPrimary} />
                : <Text style={[styles.saveBtnText, { color: c.onPrimary }]}>
                    {saved ? '✓ Saved' : 'Save Changes'}
                  </Text>
              }
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
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
    gap: DesignSpacing.stackGapLg,
  },
  avatarArea: { alignItems: 'center', paddingVertical: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '700' },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  input: {
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputReadOnly: {
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center',
    opacity: 0.6,
  },
  inputReadOnlyText: { fontSize: 16 },
  fieldNote: { fontSize: 12, lineHeight: 16 },
  saveBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 4,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});

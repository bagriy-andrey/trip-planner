import { StyleSheet, View } from "react-native";

import { AppText, Avatar } from "@/components";
import { initialOf } from "@/lib/session";
import { layout, spacing } from "@/lib/theme";

export interface ProfileHeaderProps {
  /** Display name. */
  name: string;
  email: string;
}


/** Avatar, name and email of the signed-in account. */
export function ProfileHeader({ name, email }: ProfileHeaderProps) {
  const initial = initialOf(name);
  return (
    <View style={styles.root}>
      <Avatar initials={initial} size={layout.avatarProfile} />
      <View style={styles.text}>
        {/* Long names wrap to two lines, then truncate. */}
        <AppText variant="h2" numberOfLines={2} ellipsizeMode="tail" testID="profile-name">
          {name}
        </AppText>
        <AppText color="textSecondary" numberOfLines={1} ellipsizeMode="tail" testID="profile-email">
          {email}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  text: { flex: 1, gap: spacing.xs },
});

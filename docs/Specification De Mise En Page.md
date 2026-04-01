# Specification De Mise En Page

## 1. Objet

Ce document definit la norme de mise en page commune a toutes les pages de settings.

## 2. Marges Globales De La Page

Toutes les pages de settings doivent partager la meme structure d'espacement afin de garantir une lecture stable et une impression d'unite visuelle. La marge horizontale standard doit etre de `20`, la marge superieure principale de `60`, et l'ecart entre le bouton retour et le premier bloc de contenu de `20`. Le contenu principal doit rester simple, aere et aligne sur une meme grille verticale.

Code :

screen: {
  flex: 1,
},
container: {
  flex: 1,
  paddingHorizontal: 20,
  marginTop: 60,
},
content: {
  flex: 1,
  justifyContent: "space-between",
},
title: {
  marginTop: 20,
},
card: {
  marginTop: 20,
},


## 3. Position Du Bouton Retour

Le bouton retour doit toujours apparaitre en haut a gauche de la page. Il doit s'aligner exactement sur la meme marge gauche que le contenu principal et etre place avant le titre ou avant la carte principale. Son positionnement vertical doit rester identique sur toutes les pages de settings afin d'eviter toute variation visuelle entre les ecrans.

Code :

<View style={styles.container}>
  <View style={styles.header}>
    <Pressable
      onPress={() => router.replace("/accountScreen")}
      style={[
        styles.backButton,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
    </Pressable>
  </View>

  <View style={styles.content}>
    {/* premier bloc de contenu */}
  </View>
</View>


header: {
  alignItems: "flex-start",
},


## 4. Specifications Du Bouton Retour

Le bouton retour suit une forme circulaire avec une taille de `40 x 40` et un rayon de `20`. L'icone utilise `ChevronLeft`, avec une taille de `22` et une epaisseur de trait de `2.5`. L'alignement doit etre parfaitement centre. Le bouton conserve une bordure fine avec `StyleSheet.hairlineWidth` et une ombre legere pour maintenir un relief discret.

Code :

backButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: StyleSheet.hairlineWidth,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
  elevation: 3,
},


<ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />


## 5. Couleurs Du Bouton Retour

Le bouton retour doit toujours suivre le theme actif de l'application. Le fond utilise `colors.card`, la bordure utilise `colors.border`, et l'icone utilise `colors.text`. Aucune apparence finale ne doit etre figee avec une couleur absolue comme noir ou blanc.

Code reel :

```tsx
<Pressable
  style={[
    styles.backButton,
    { backgroundColor: colors.card, borderColor: colors.border },
  ]}
>
  <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
</Pressable>
```

## 6. Regle De Coherence

La coherence est une regle centrale de toutes les pages de settings. Le bouton retour doit conserver exactement le meme style, la meme taille, la meme position et les memes espacements d'une page a l'autre. Le theme actif doit toujours piloter son apparence finale, afin que la navigation reste visuellement stable dans tous les modes.

Code reel :


return (
  <View style={[styles.screen, { backgroundColor: colors.bg }]}>
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace("/accountScreen")}
          style={[
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* contenu de la page */}
      </View>
    </View>
  </View>
);

## 7. Boutons D'Action

Les pages de settings peuvent contenir des boutons d'action directement dans le contenu principal. Ces boutons doivent utiliser une forme en pilule, une bordure simple et une integration complete avec le theme actif. Ils servent en general a ouvrir un panneau, lancer une action secondaire ou declencher une etape de parametrage.

Code :

manageButton: {
  marginTop: 20,
  alignSelf: "flex-start",
  paddingVertical: 10,
  paddingHorizontal: 20,
  borderRadius: 999,
  borderWidth: 1,
},

<Pressable
  style={[
    styles.manageButton,
    { backgroundColor: colors.card, borderColor: colors.border },
  ]}
>
  <Text style={[styles.manageButtonText, { color: colors.text }]}>
    {t("persoManage")}
  </Text>
</Pressable>


## 8. Bouton Principal De Sauvegarde En Bas De Page

Toutes les pages de settings doivent contenir un bouton principal de sauvegarde place en bas, au centre de l'ecran. Ce bouton sert a valider explicitement les modifications de la page. Il doit reprendre une forme en pilule, un espacement interieur large et une apparence entierement pilotee par le theme actif. La reference de position et de style est le bouton `Enregistrer` de la page `general`.

Position et parametres a reutiliser :

- le conteneur du bouton est `footer`
- le bouton lui-meme est `saveButton`
- le texte du bouton est `saveButtonText`
- `footer` doit rester dans le dernier bloc de `content`, avec `alignItems: "center"` et `paddingBottom: 20`
- `saveButton` doit utiliser `paddingVertical: 14`, `paddingHorizontal: 40`, `borderRadius: 999` et `borderWidth: 1`

Code :

footer: {
  paddingBottom: 20,
  alignItems: "center",
},
saveButton: {
  paddingVertical: 14,
  paddingHorizontal: 40,
  borderRadius: 999,
  borderWidth: 1,
},
saveButtonText: {
  fontSize: 16,
  fontWeight: "700",
},

<View style={styles.content}>
  <View>
    {/* options et parametres de la page */}
  </View>

  <View style={styles.footer}>
    <Pressable
      style={[
        styles.saveButton,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={handleSave}
    >
      <Text style={[styles.saveButtonText, { color: colors.text }]}>
        {t("generalSave")}
      </Text>
    </Pressable>
  </View>
</View>


## 9. Etat Desactive Du Bouton

Lorsqu'une action n'est pas disponible, le bouton doit exprimer son indisponibilite de facon visuelle et fonctionnelle. La presentation recommandee repose sur une baisse d'opacite, combinee a l'utilisation de la propriete `disabled` sur le composant interactif.

Code :

disabledButton: {
  opacity: 0.4,
},

<Pressable
  style={[
    styles.manageButton,
    isManageDisabled && styles.disabledButton,
    { backgroundColor: colors.card, borderColor: colors.border },
  ]}
  disabled={isManageDisabled}
>
  <Text style={[styles.manageButtonText, { color: colors.text }]}>
    {t("persoManage")}
  </Text>
</Pressable>


## 10. Boutons Secondaires Et Bouton D'Alerte

Dans les panneaux ou les modales de settings, il est possible d'utiliser une paire de boutons secondaires pour les actions auxiliaires. Le bouton secondaire standard garde le style du theme avec une bordure visible. Le bouton d'alerte conserve la meme structure generale, mais met davantage l'accent sur la nature sensible de l'action.

Code :

secondaryActionButton: {
  marginRight: 12,
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 999,
  borderWidth: 1,
},
dangerActionButton: {
  marginLeft: 12,
  paddingVertical: 12,
  paddingHorizontal: 20,
  borderRadius: 999,
  borderWidth: 1,
},

<View style={styles.footerRow}>
  <Pressable
    style={[
      styles.secondaryActionButton,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
    onPress={openAdd}
  >
    <Text style={[styles.secondaryActionText, { color: colors.text }]}>
      {t("persoAddMemory")}
    </Text>
  </Pressable>

  <Pressable
    style={[styles.dangerActionButton, { backgroundColor: colors.card }]}
    onPress={askClearAll}
  >
    <Text style={styles.dangerActionText}>{t("persoClearMemory")}</Text>
  </Pressable>
</View>


## 11. Boutons De Confirmation Dans Une Modale

Lorsqu'une modale de settings demande une confirmation explicite, les deux actions doivent etre clairement separees. Le bouton de gauche correspond a l'annulation, tandis que le bouton de droite correspond a la validation finale. La hierarchie visuelle doit rendre la decision lisible en un coup d'oeil.

Code :

cancelClearButton: {
  flex: 1,
  marginRight: 8,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: "center",
},
confirmClearButton: {
  flex: 1,
  marginLeft: 8,
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: "center",
},

<View style={styles.clearButtonsRow}>
  <Pressable
    style={[styles.cancelClearButton, { backgroundColor: colors.border }]}
    onPress={resetPanels}
  >
    <Text style={[styles.cancelClearText, { color: colors.text }]}>
      {t("cancel")}
    </Text>
  </Pressable>

  <Pressable
    style={[styles.confirmClearButton, { backgroundColor: colors.text }]}
    onPress={clearAll}
  >
    <Text style={[styles.confirmClearText, { color: colors.bg }]}>
      {t("persoConfirm")}
    </Text>
  </Pressable>
</View>


## 12. Cartes De Ligne Pour Les Options

Dans une page de settings, chaque option peut etre presentee sous la forme d'une carte de ligne. Cette carte sert a regrouper une action ou un parametre dans un bloc clair, lisible et facilement cliquable. Elle doit utiliser un fond lie au theme, un rayon modere, un espacement interieur confortable et une structure horizontale permettant d'aligner le texte principal avec une valeur, une icone ou un controle secondaire.

Code :

item: {
  borderRadius: 16,
  paddingHorizontal: 18,
  paddingVertical: 18,
  marginBottom: 14,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

<TouchableOpacity
  style={[styles.item, { backgroundColor: colors.card }]}
  onPress={onPress}
>
  <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
  <View style={styles.right}>
    <Text style={[styles.value, { color: colors.subtext }]}>{value}</Text>
    <ChevronRight size={18} color={colors.subtext} />
  </View>
</TouchableOpacity>


## 13. Titre Centre De La Page

Lorsqu'un titre de page doit etre centre, il peut etre affiche sous la forme `— Titre —` avec un alignement horizontal centre. Dans ce cas, les autres parametres deja definis, comme les marges et les espacements verticaux, restent inchanges. La modification porte uniquement sur le contenu du titre et sur `textAlign: "center"`.

Code :

title: {
  fontSize: 22,
  fontWeight: "600",
  marginTop: 20,
  marginBottom: 24,
  textAlign: "center",
},

<Text style={[styles.title, { color: colors.text }]}>
  — {t("pageTitle")} —
</Text>


## 14. Parametres Des Interrupteurs

Lorsqu'une page de settings contient un interrupteur, les parametres visuels doivent etre definis explicitement. Le rail inactif utilise `colors.subtext`, le rail actif utilise `colors.subaccent`, et le bouton mobile utilise `colors.accent` lorsqu'il est actif, sinon `colors.text`. Cette specification ne modifie pas les autres regles de mise en page de la ligne ou de la page.

Code :

<Switch
  value={value}
  onValueChange={onChange}
  trackColor={{
    false: colors.subtext,
    true: colors.subaccent,
  }}
  thumbColor={value ? colors.accent : colors.text}
  ios_backgroundColor={colors.subtext}
/>


## 15. Validation Differee Des Modifications

Les pages de settings ne doivent pas enregistrer automatiquement une modification des qu'un parametre est change. Toute modification doit d'abord etre stockee dans un etat temporaire local a la page. L'enregistrement global ne doit se produire qu'au moment du clic sur le bouton de sauvegarde en bas de page. Si l'utilisateur quitte directement la page sans appuyer sur ce bouton, les changements ne doivent pas etre conserves.

Code :

const [draftThemeMode, setDraftThemeMode] = useState(themeMode);
const [draftLanguage, setDraftLanguage] = useState(language);
const [draftNotificationsEnabled, setDraftNotificationsEnabled] =
  useState(notificationsEnabled);

const handleSave = () => {
  setThemeMode(draftThemeMode);
  setLanguage(draftLanguage);
  setNotificationsEnabled(draftNotificationsEnabled);
};

<Switch
  value={draftNotificationsEnabled}
  onValueChange={setDraftNotificationsEnabled}
/>

<Pressable onPress={handleSave}>
  <Text>{t("generalSave")}</Text>
</Pressable>

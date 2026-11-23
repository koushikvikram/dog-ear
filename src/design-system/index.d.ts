import type * as React from 'react';

export type Platform = 'desktop' | 'mobile';

export type IconName = 'logo' | 'lexicon' | 'graph' | 'highlight' | 'highlight-tab' | 'pencil' | 'trash' | 'trash-simple' | 'search' | 'plus' | 'close' | 'back' | 'chevron-down' | 'chevron-down-wide' | 'mic' | 'mic-sm' | 'mail' | 'check' | 'arrow-right' | 'eye';

/** The page frame: bg ground, Manrope, text colour, and the positioning context for scrims, drawers, sheets and dialogs. */
export interface AppShellProps extends React.HTMLAttributes<HTMLElement> {
  platform?: "desktop" | "mobile";
  minHeight?: string;
  children: React.ReactNode;
}
export declare function AppShell(props: AppShellProps): React.ReactElement;

/** Centred desktop content column with the 40px side padding. */
export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  width?: "wide" | "default" | "narrow";
  style?: any;
  children: React.ReactNode;
}
export declare function Container(props: ContainerProps): React.ReactElement;

/** The scrolling body of a phone screen inside a mobile AppShell. */
export interface ScrollAreaProps extends React.HTMLAttributes<HTMLElement> {
  style?: any;
  children: React.ReactNode;
}
export declare function ScrollArea(props: ScrollAreaProps): React.ReactElement;

/** The positioned, scrolling middle of the phone Book screen, between AppHeader and BottomTabBar. */
export interface AppBodyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
export declare function AppBody(props: AppBodyProps): React.ReactElement;

/** The folded-page mark and the name Dog-Ear, set in Manrope 800 at 18px. */
export interface WordmarkProps extends React.HTMLAttributes<HTMLElement> {
  admin?: boolean;
}
export declare function Wordmark(props: WordmarkProps): React.ReactElement;

/** The 20 stroke icons the prototypes draw, copied path for path. */
export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name: IconName;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
}
export declare function Icon(props: IconProps): React.ReactElement;

/** The four button kinds: primary (accent fill), secondary (outline, 15px), subtle (outline, 14px) and danger (coral fill). */
export interface ButtonProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "primary" | "secondary" | "subtle" | "danger";
  tone?: "danger";
  size?: "sm";
  platform?: "desktop" | "mobile";
  block?: boolean;
  compact?: boolean;
  on?: boolean;
  icon?: IconName;
  href?: string;
}
export declare function Button(props: ButtonProps): React.ReactElement;

/** A 44 × 44 button holding one icon or glyph: close, dismiss, remove. */
export interface IconButtonProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
  platform?: "desktop" | "mobile";
  muted?: boolean;
  icon?: IconName (default close);
  iconSize?: number;
  children?: React.ReactNode;
}
export declare function IconButton(props: IconButtonProps): React.ReactElement;

/** An accent-coloured text action that reveals more of a form ("+ Add quote", "+ Who is in it?"). */
export interface TextButtonProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  onClick: (e?: any) => void;
}
export declare function TextButton(props: TextButtonProps): React.ReactElement;

/** Round 44px dictation button that sits inside a text field. */
export interface MicButtonProps extends React.HTMLAttributes<HTMLElement> {
  on?: boolean;
  label?: string;
}
export declare function MicButton(props: MicButtonProps): React.ReactElement;

/** Bordered "Dictate" pill beside a field label in the desktop highlight drawer. */
export interface MicPillProps extends React.HTMLAttributes<HTMLElement> {
  recording?: boolean;
  children?: React.ReactNode;
}
export declare function MicPill(props: MicPillProps): React.ReactElement;

/** The 56px accent add button pinned bottom-right of the phone character canvas. */
export interface FabProps extends React.HTMLAttributes<HTMLElement> {
  label?: string;
}
export declare function Fab(props: FabProps): React.ReactElement;

/** Two-option switch on a bg track (Request an invite / I have an invite). */
export interface SegmentedControlProps extends React.HTMLAttributes<HTMLElement> {
  items: { label;
  selected?: boolean;
  onClick }[]: (e?: any) => void;
  label?: string;
}
export declare function SegmentedControl(props: SegmentedControlProps): React.ReactElement;

/** Underlined section tabs with count pills (Lexicon, Characters, Highlights). */
export interface TabsProps extends React.HTMLAttributes<HTMLElement> {
  items: { label;
  count?: number | string;
  selected?: boolean;
  onClick }[]: (e?: any) => void;
}
export declare function Tabs(props: TabsProps): React.ReactElement;

/** One underlined tab; Tabs is a row of these, and the tie popover header uses two directly. */
export interface TabProps extends React.HTMLAttributes<HTMLElement> {
  selected?: boolean;
  count?: number | string;
  children: React.ReactNode;
}
export declare function Tab(props: TabProps): React.ReactElement;

/** The 64px phone tab bar: Highlights, Characters, Lexicon with 22px icons. */
export interface BottomTabBarProps extends React.HTMLAttributes<HTMLElement> {
  items: { label;
  icon: IconName;
  selected?: boolean;
  onClick }[]: (e?: any) => void;
}
export declare function BottomTabBar(props: BottomTabBarProps): React.ReactElement;

/** The 56px phone header: back arrow, the book title (17px/800, truncated) and a trailing slot for SyncStatus. */
export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  backHref: string;
  backLabel?: string;
  trailing?: any;
}
export declare function AppHeader(props: AppHeaderProps): React.ReactElement;

/** The account button with initial disc, email (desktop only) and chevron; opens the Menu. */
export interface AccountButtonProps extends React.HTMLAttributes<HTMLElement> {
  initial?: string;
  email?: string;
  expanded?: boolean;
}
export declare function AccountButton(props: AccountButtonProps): React.ReactElement;

/** Dropdown menu anchored 50px below its trigger, right-aligned, 240px min. */
export interface MenuProps extends React.HTMLAttributes<HTMLElement> {
  header?: string;
  children: React.ReactNode;
}
export declare function Menu(props: MenuProps): React.ReactElement;

/** A 44px row inside Menu; `href` makes it a link. */
export interface MenuItemProps extends React.HTMLAttributes<HTMLElement> {
  href?: string;
  onClick?: (e?: any) => void;
  children: React.ReactNode;
}
export declare function MenuItem(props: MenuItemProps): React.ReactElement;

/** Pill-shaped filter and choice chip; selected chips invert to a light fill. */
export interface ChipProps extends React.HTMLAttributes<HTMLElement> {
  selected?: boolean;
  size?: "md" | "lg" | "touch";
  dot?: string;
  count?: number;
  add?: boolean;
}
export declare function Chip(props: ChipProps): React.ReactElement;

/** Small status pill: neutral (Admin), pending, approved, declined. */
export interface BadgeProps extends React.HTMLAttributes<HTMLElement> {
  tone?: "neutral" | "pending" | "approved" | "declined";
}
export declare function Badge(props: BadgeProps): React.ReactElement;

/** A colour dot: 10px for tie types and labels on desktop, 8px for statuses and phone chips, 12px in the phone label picker. */
export interface DotProps extends React.HTMLAttributes<HTMLElement> {
  color: string;
  size?: 8 | 10 | 12;
}
export declare function Dot(props: DotProps): React.ReactElement;

/** A label wrapping its control: text-muted label above, 6px gap (13px) on desktop, 4px gap (12px) on phone Book. */
export interface FieldProps extends React.HTMLAttributes<HTMLElement> {
  label: ReactNode;
  platform?: "desktop" | "mobile";
  children: React.ReactNode;
}
export declare function Field(props: FieldProps): React.ReactElement;

/** The 44px text input; also renders select and textarea via `as`. */
export interface TextInputProps extends React.HTMLAttributes<HTMLElement> {
  as?: "input" | "select" | "textarea";
  ground?: "card" | "page";
  size?: "md" | "lg";
  invalid?: boolean;
  pageNumber?: boolean;
  /** ...input props */
}
export declare function TextInput(props: TextInputProps): React.ReactElement;

/** Native select styled as a TextInput. */
export interface SelectProps extends React.HTMLAttributes<HTMLElement> {
  /** same as TextInput */
  children: React.ReactNode;
}
export declare function Select(props: SelectProps): React.ReactElement;

/** Multi-line field on a page ground: 88px, vertical resize (Welcome); `size="lg"` = 84px, 16px, no resize (phone Book). */
export interface TextAreaProps extends React.HTMLAttributes<HTMLElement> {
  size?: "md" | "lg";
  /** ...textarea props */
}
export declare function TextArea(props: TextAreaProps): React.ReactElement;

/** Search box with a leading 18px search icon and a bare input. */
export interface SearchFieldProps extends React.HTMLAttributes<HTMLElement> {
  size?: "md" | "lg" | "touch";
  placeholder: any;
  label?: any;
  value: any;
  onChange: (e?: any) => void;
  trailing?: any;
}
export declare function SearchField(props: SearchFieldProps): React.ReactElement;

/** Off-screen spam trap field for the invite request form. */
export interface HoneypotProps extends React.HTMLAttributes<HTMLElement> {

}
export declare function Honeypot(props: HoneypotProps): React.ReactElement;

/** Inline error (role=alert), 13px coral, placed directly under the field or above the submit button. */
export interface ErrorTextProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
export declare function ErrorText(props: ErrorTextProps): React.ReactElement;

/** Uppercase 12px/700 label with 0.06em tracking for groups of controls (Status, Tie type, Quick capture). */
export interface EyebrowProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "span";
  children: React.ReactNode;
}
export declare function Eyebrow(props: EyebrowProps): React.ReactElement;

/** Muted 15px/1.6 paragraph for empty lists and no-match results. */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;

/** The Welcome card: 420px (full width on phone), radius 16, 24px padding, the only element with shadow-card. */
export interface AuthCardProps extends React.HTMLAttributes<HTMLElement> {
  platform?: "desktop" | "mobile";
  children: React.ReactNode;
}
export declare function AuthCard(props: AuthCardProps): React.ReactElement;

/** Bordered surface card: 18px padding on desktop (quick capture, drawer sub-forms), 14 16 on phone (every phone card). */
export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  platform?: "desktop" | "mobile";
  children: React.ReactNode;
}
export declare function Panel(props: PanelProps): React.ReactElement;

/** Small feature card on Welcome: 22px icon in a palette colour, 15px title, 13px description. */
export interface FeatureTileProps extends React.HTMLAttributes<HTMLElement> {
  icon: IconName;
  color: string;
  title: string;
  children: React.ReactNode;
}
export declare function FeatureTile(props: FeatureTileProps): React.ReactElement;

/** 36px accent-soft disc with a check or mail icon, beside a result title. */
export interface SuccessDiscProps extends React.HTMLAttributes<HTMLElement> {
  icon?: "check" | "mail";
}
export declare function SuccessDisc(props: SuccessDiscProps): React.ReactElement;

/** The 56 × 76 coloured book block with the title initial and a spine shadow. */
export interface BookCoverProps extends React.HTMLAttributes<HTMLElement> {
  color: string;
  initial: string;
}
export declare function BookCover(props: BookCoverProps): React.ReactElement;

/** A book on the shelf: cover, title, author, status and last-opened, last highlight and counts, plus edit and delete buttons. */
export interface BookCardProps extends React.HTMLAttributes<HTMLElement> {
  title: any;
  author?: any;
  color: any;
  status: any;
  statusColor: any;
  opened: any;
  lastHighlight: any;
  counts: { chars;
  ties: any;
  hl: any;
  words }: any;
  href: any;
  onEdit: (e?: any) => void;
  onDelete: (e?: any) => void;
}
export declare function BookCard(props: BookCardProps): React.ReactElement;

/** Dashed placeholder card that opens the New book drawer when the shelf is empty. */
export interface AddBookCardProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  onClick: (e?: any) => void;
}
export declare function AddBookCard(props: AddBookCardProps): React.ReactElement;

/** An invite request: email with status badge, the note, the date, and its actions. */
export interface RequestRowProps extends React.HTMLAttributes<HTMLElement> {
  email: any;
  status: any;
  statusLabel: any;
  note: any;
  when: any;
  actions: any;
}
export declare function RequestRow(props: RequestRowProps): React.ReactElement;

/** Desktop lexicon row: 19px headword, part of speech, definition, remove button, hairline below. */
export interface WordEntryProps extends React.HTMLAttributes<HTMLElement> {
  word: any;
  pos: any;
  definition: any;
  onRemove: (e?: any) => void;
}
export declare function WordEntry(props: WordEntryProps): React.ReactElement;

/** Phone lexicon card: 16px headword, definition, muted trash button. */
export interface WordCardProps extends React.HTMLAttributes<HTMLElement> {
  word: any;
  definition: any;
  onRemove: (e?: any) => void;
}
export declare function WordCard(props: WordCardProps): React.ReactElement;

/** Dictionary suggestion row in the Add word drawer; `hot` marks the keyboard-highlighted row. */
export interface SuggestionProps extends React.HTMLAttributes<HTMLElement> {
  word: any;
  pos: any;
  definition: any;
  badge?: any;
  hot?: boolean;
}
export declare function Suggestion(props: SuggestionProps): React.ReactElement;

/** Muted 14px helper line inside a drawer list ("Start typing to see words and their meanings."). */
export interface NoteProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
export declare function Note(props: NoteProps): React.ReactElement;

/** Desktop highlight: 26px page numeral, label dot and name, serif quote, thought, mentions in palette-blue. */
export interface HighlightRowProps extends React.HTMLAttributes<HTMLElement> {
  page: number | string;
  label: any;
  labelColor: any;
  quote?: any;
  note?: any;
  mentions?: any;
  onOpen: (e?: any) => void;
}
export declare function HighlightRow(props: HighlightRowProps): React.ReactElement;

/** Phone highlight: "p. N", label, trash button, then quote, thought and names. */
export interface HighlightCardProps extends React.HTMLAttributes<HTMLElement> {
  page: number | string;
  label: any;
  labelColor: any;
  quote?: any;
  note?: any;
  names?: any;
  onOpen: (e?: any) => void;
  onRemove: (e?: any) => void;
}
export declare function HighlightCard(props: HighlightCardProps): React.ReactElement;

/** A row of a manage list (tie types, highlight labels): colour swatch that cycles, name input, count, delete. */
export interface SwatchRowProps extends React.HTMLAttributes<HTMLElement> {
  platform?: any;
  color: any;
  name: any;
  count?: number | string;
  onCycle: (e?: any) => void;
  onRename: (e?: any) => void;
  onRemove: (e?: any) => void;
  inputLabel?: any;
  removeLabel?: any;
  leading?: any;
  swatchSize?: any;
}
export declare function SwatchRow(props: SwatchRowProps): React.ReactElement;

/** Full-bleed 50% black button behind drawers and dialogs; clicking it closes them. */
export interface ScrimProps extends React.HTMLAttributes<HTMLElement> {
  label?: string;
  onClick: (e?: any) => void;
}
export declare function Scrim(props: ScrimProps): React.ReactElement;

/** Desktop: 440px panel from the right. Phone (`placement="bottom"`): the same content as a bottom sheet, max 88% tall. */
export interface DrawerProps extends React.HTMLAttributes<HTMLElement> {
  placement?: "right" | "bottom";
  children: React.ReactNode;
}
export declare function Drawer(props: DrawerProps): React.ReactElement;

/** Drawer top row: a muted context line ("Add to The Salt Ledger") and the close button. */
export interface DrawerHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: any;
  onClose: (e?: any) => void;
}
export declare function DrawerHeader(props: DrawerHeaderProps): React.ReactElement;

/** Padded drawer content stack: 8 24 28 padding, 14px gaps. */
export interface DrawerBodyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
export declare function DrawerBody(props: DrawerBodyProps): React.ReactElement;

/** Phone bottom sheet docked above the 64px tab bar, radius 18 on top, max 520px (600px for long forms). */
export interface SheetProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
  children: React.ReactNode;
}
export declare function Sheet(props: SheetProps): React.ReactElement;

/** Sheet title (17px/800) with optional actions and a close button. */
export interface SheetHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: any;
  onClose?: (e?: any) => void;
  actions?: any;
}
export declare function SheetHeader(props: SheetHeaderProps): React.ReactElement;

/** Centred 420px alert dialog for destructive confirmation. */
export interface DialogProps extends React.HTMLAttributes<HTMLElement> {
  title: any;
  titleId?: any;
  children: React.ReactNode;
  actions: any;
}
export declare function Dialog(props: DialogProps): React.ReactElement;

/** Inverse status message with optional Undo and a × dismiss. */
export interface ToastProps extends React.HTMLAttributes<HTMLElement> {
  message: any;
  placement?: "fixed" | "mobile" | "tabbar";
  actionLabel?: any;
  onAction?: (e?: any) => void;
  onDismiss: (e?: any) => void;
}
export declare function Toast(props: ToastProps): React.ReactElement;

/** 380px panel over the character canvas for editing one tie or the tie types. */
export interface PopoverProps extends React.HTMLAttributes<HTMLElement> {
  label: any;
  /** style (left, top, maxHeight) */
  children: React.ReactNode;
}
export declare function Popover(props: PopoverProps): React.ReactElement;

/** Save state: accent dot + "Saved", or warning dot + "Offline · N waiting". */
export interface SyncStatusProps extends React.HTMLAttributes<HTMLElement> {
  offline?: boolean;
  platform?: any;
  children: React.ReactNode;
}
export declare function SyncStatus(props: SyncStatusProps): React.ReactElement;

/** Dismissible green-tinted tip explaining a gesture-heavy surface (the character canvas). */
export interface HintBarProps extends React.HTMLAttributes<HTMLElement> {
  platform?: any;
  onDismiss: (e?: any) => void;
  children: React.ReactNode;
}
export declare function HintBar(props: HintBarProps): React.ReactElement;

/** Accent banner for a pending pick ("Tap who Mara Vell is tied to") with Cancel. */
export interface ActionBannerProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  action: any;
}
export declare function ActionBanner(props: ActionBannerProps): React.ReactElement;

/** Line under the desktop canvas naming the selected character with Edit card and Remove. */
export interface SelectionBarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}
export declare function SelectionBar(props: SelectionBarProps): React.ReactElement;

/** The dotted, pannable canvas for the character graph (22px dot pitch on surface). */
export interface GraphCanvasProps extends React.HTMLAttributes<HTMLElement> {
  framed?: boolean;
  style: any;
  children: React.ReactNode;
}
export declare function GraphCanvas(props: GraphCanvasProps): React.ReactElement;

/** Desktop character node: avatar initial, first name and job, with the green handle that starts a tie. */
export interface CharacterNodeProps extends React.HTMLAttributes<HTMLElement> {
  x: number | string;
  y: number | string;
  name: any;
  first: any;
  job: any;
  initial: any;
  avatar: any;
  ring: any;
  opacity?: any;
  nodeProps?: any;
  handleProps?: any;
}
export declare function CharacterNode(props: CharacterNodeProps): React.ReactElement;

/** Phone character node: a 112 × 44 pill with the full name, truncated. */
export interface NodePillProps extends React.HTMLAttributes<HTMLElement> {
  x: number | string;
  y: number | string;
  ring: any;
  opacity?: any;
  children: React.ReactNode;
}
export declare function NodePill(props: NodePillProps): React.ReactElement;

/** Pill on a tie's midpoint with the tie's words, bordered in the tie-type colour; click to edit. */
export interface TieLabelProps extends React.HTMLAttributes<HTMLElement> {
  x: number | string;
  y: number | string;
  color: any;
  opacity?: any;
  children: React.ReactNode;
}
export declare function TieLabel(props: TieLabelProps): React.ReactElement;

/** Bottom-right canvas toolbar: zoom out, zoom %, zoom in, Fit, Auto-arrange. */
export interface CanvasToolbarProps extends React.HTMLAttributes<HTMLElement> {
  zoom: string;
  onZoomIn: (e?: any) => void;
  onZoomOut: (e?: any) => void;
  onFit: (e?: any) => void;
  onArrange: (e?: any) => void;
}
export declare function CanvasToolbar(props: CanvasToolbarProps): React.ReactElement;

/** Phone canvas controls stacked top-right: Ties, +, −, Fit, Auto. */
export interface GraphControlsProps extends React.HTMLAttributes<HTMLElement> {
  hiddenDot?: boolean;
  onTypes: (e?: any) => void;
  onZoomIn: (e?: any) => void;
  onZoomOut: (e?: any) => void;
  onFit: (e?: any) => void;
  onArrange: (e?: any) => void;
}
export declare function GraphControls(props: GraphControlsProps): React.ReactElement;

export declare const ICON_NAMES: IconName[];

declare global { interface Window { DogEar: { AppShell: typeof AppShell; Container: typeof Container; ScrollArea: typeof ScrollArea; AppBody: typeof AppBody; Wordmark: typeof Wordmark; Icon: typeof Icon; Button: typeof Button; IconButton: typeof IconButton; TextButton: typeof TextButton; MicButton: typeof MicButton; MicPill: typeof MicPill; Fab: typeof Fab; SegmentedControl: typeof SegmentedControl; Tabs: typeof Tabs; Tab: typeof Tab; BottomTabBar: typeof BottomTabBar; AppHeader: typeof AppHeader; AccountButton: typeof AccountButton; Menu: typeof Menu; MenuItem: typeof MenuItem; Chip: typeof Chip; Badge: typeof Badge; Dot: typeof Dot; Field: typeof Field; TextInput: typeof TextInput; Select: typeof Select; TextArea: typeof TextArea; SearchField: typeof SearchField; Honeypot: typeof Honeypot; ErrorText: typeof ErrorText; Eyebrow: typeof Eyebrow; EmptyState: typeof EmptyState; AuthCard: typeof AuthCard; Panel: typeof Panel; FeatureTile: typeof FeatureTile; SuccessDisc: typeof SuccessDisc; BookCover: typeof BookCover; BookCard: typeof BookCard; AddBookCard: typeof AddBookCard; RequestRow: typeof RequestRow; WordEntry: typeof WordEntry; WordCard: typeof WordCard; Suggestion: typeof Suggestion; Note: typeof Note; HighlightRow: typeof HighlightRow; HighlightCard: typeof HighlightCard; SwatchRow: typeof SwatchRow; Scrim: typeof Scrim; Drawer: typeof Drawer; DrawerHeader: typeof DrawerHeader; DrawerBody: typeof DrawerBody; Sheet: typeof Sheet; SheetHeader: typeof SheetHeader; Dialog: typeof Dialog; Toast: typeof Toast; Popover: typeof Popover; SyncStatus: typeof SyncStatus; HintBar: typeof HintBar; ActionBanner: typeof ActionBanner; SelectionBar: typeof SelectionBar; GraphCanvas: typeof GraphCanvas; CharacterNode: typeof CharacterNode; NodePill: typeof NodePill; TieLabel: typeof TieLabel; CanvasToolbar: typeof CanvasToolbar; GraphControls: typeof GraphControls; ICON_NAMES: IconName[] } } }

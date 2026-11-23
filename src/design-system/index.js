// ES-module entry for the vendored Dog-Ear design system.
// Order matters: react-global.js must run before bundle.js, and tokens.css before bundle.css.
import './react-global.js'
import './bundle.js'
import './tokens.css'
import './bundle.css'

const DS = window.DogEar

export const {
  AccountButton, ActionBanner, AddBookCard, AppBody, AppHeader, AppShell, AuthCard, Badge, BookCard, BookCover,
  BottomTabBar, Button, CanvasToolbar, CharacterNode, Chip, Container, Dialog, Dot, Drawer, DrawerBody, DrawerHeader,
  EmptyState, ErrorText, Eyebrow, Fab, FeatureTile, Field, GraphCanvas, GraphControls, HighlightCard, HighlightRow,
  HintBar, Honeypot, Icon, IconButton, Menu, MenuItem, MicButton, MicPill, NodePill, Note, Panel, Popover, RequestRow,
  Scrim, ScrollArea, SearchField, SegmentedControl, Select, SelectionBar, Sheet, SheetHeader, SuccessDisc, Suggestion,
  SwatchRow, SyncStatus, Tab, Tabs, TextArea, TextButton, TextInput, TieLabel, Toast, WordCard, WordEntry, Wordmark,
} = DS

export default DS

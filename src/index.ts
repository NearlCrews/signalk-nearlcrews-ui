/* eslint-disable @typescript-eslint/no-deprecated -- deprecated aliases stay exported for one minor release */
export {
  ActionBar,
  type ActionBarProps,
  type ActionBarSticky,
} from "./components/ActionBar.js";
export {
  Banner,
  type BannerLive,
  type BannerProps,
  type BannerTone,
} from "./components/Banner.js";
export {
  Button,
  type ButtonAsAnchorProps,
  type ButtonAsButtonProps,
  type ButtonProps,
  type ButtonShape,
  type ButtonSize,
  type ButtonVariant,
} from "./components/Button.js";
export {
  type CollapsibleMountStrategy,
  CollapsibleSection,
  type CollapsibleSectionProps,
  type CollapsibleSummaryPlacement,
  type CollapsibleSummaryVisibility,
  type CollapsibleVariant,
} from "./components/CollapsibleSection.js";
export {
  FieldGroup,
  type FieldGroupProps,
} from "./components/FieldGroup.js";
export {
  InlineConfirm,
  type InlineConfirmCancelReason,
  type InlineConfirmProps,
} from "./components/InlineConfirm.js";
export {
  Checkbox,
  type CheckboxErrorLive,
  type CheckboxLabelVisibility,
  type CheckboxProps,
  type MonospaceControlProps,
  NumberInput,
  type NumberInputProps,
  RangeInput,
  type RangeInputProps,
  Select,
  type SelectProps,
  Textarea,
  type TextareaProps,
  TextInput,
  type TextInputProps,
  type TextInputType,
} from "./components/Inputs.js";
export {
  type FieldControlProps,
  type FieldErrorLive,
  LabeledField,
  type LabeledFieldChild,
  type LabeledFieldControlProps,
  type LabeledFieldDensity,
  type LabeledFieldLayout,
  type LabeledFieldProps,
  type SplitLabeledFieldControlProps,
  splitLabeledFieldControlProps,
} from "./components/LabeledField.js";
export {
  Badge,
  type BadgeProps,
  Card,
  type CardDensity,
  type CardElement,
  type CardProps,
  Cluster,
  type ClusterElement,
  type ClusterProps,
  InputGroup,
  InputGroupAddon,
  type InputGroupAddonProps,
  InputGroupControl,
  type InputGroupControlProps,
  type InputGroupControlWidth,
  type InputGroupDensity,
  type InputGroupProps,
  type LayoutAlignment,
  Metric,
  MetricGrid,
  type MetricGridElement,
  type MetricGridProps,
  type MetricProps,
  type SpaceScale,
  Stack,
  type StackElement,
  type StackProps,
} from "./components/Layout.js";
export {
  LiveRegion,
  type LiveRegionElement,
  type LiveRegionProps,
} from "./components/LiveRegion.js";
export {
  NumberField,
  type NumberFieldInputProps,
  type NumberFieldMessages,
  type NumberFieldProps,
} from "./components/NumberField.js";
export {
  PanelErrorBoundary,
  type PanelErrorBoundaryFallbackProps,
  type PanelErrorBoundaryProps,
} from "./components/PanelErrorBoundary.js";
export {
  PanelRoot,
  type PanelRootProps,
  type PanelWidth,
} from "./components/PanelRoot.js";
export {
  PanelShell,
  type PanelShellProps,
  type PanelShellThemeToggle,
} from "./components/PanelShell.js";
export {
  RelativeAge,
  type RelativeAgeElement,
  type RelativeAgeProps,
} from "./components/RelativeAge.js";
export { Section, type SectionProps } from "./components/Section.js";
export {
  SegmentedControl,
  type SegmentedControlLabelVisibility,
  type SegmentedControlLegendVisibility,
  type SegmentedControlOption,
  type SegmentedControlOrientation,
  type SegmentedControlProps,
} from "./components/SegmentedControl.js";
export {
  StatusIndicator,
  type StatusIndicatorProps,
  type StatusIndicatorSize,
} from "./components/StatusIndicator.js";
export {
  Code,
  type CodeElement,
  type CodeProps,
  Text,
  type TextElement,
  type TextProps,
  type TextSize,
  type TextTone,
} from "./components/Text.js";
export {
  ThemeToggle,
  type ThemeToggleProps,
} from "./components/ThemeToggle.js";
export {
  UnsupportedBrowserNotice,
  type UnsupportedBrowserNoticeProps,
} from "./components/UnsupportedBrowserNotice.js";
export {
  VisuallyHidden,
  type VisuallyHiddenElement,
  type VisuallyHiddenProps,
} from "./components/VisuallyHidden.js";
export {
  type NumberDraft,
  type NumberDraftInputProps,
  type NumberDraftInvalidReason,
  type NumberDraftOptions,
  type NumberDraftResolution,
  resolveNumberDraft,
  type UseNumberDraftOptions,
  useNumberDraft,
} from "./hooks/use-number-draft.js";
export { useUnsavedChangesGuard } from "./hooks/use-unsaved-changes-guard.js";
export {
  supportsNativeCssScope,
  UnsupportedBrowserError,
} from "./styles/install.js";
export {
  type ColorTokenName,
  type FoundationTokenName,
  PUBLIC_COLOR_TOKEN_NAMES,
  PUBLIC_FOUNDATION_TOKEN_NAMES,
  PUBLIC_TOKEN_NAMES,
} from "./styles/tokens.js";
export {
  type ThemeContextValue,
  ThemeProvider,
  type ThemeProviderProps,
  usePanelTheme,
} from "./theme/context.js";
export {
  isThemeChoice,
  THEME_CHOICES,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "./theme/contract.js";
export type { AnnouncementMode } from "./utils/announcement.js";
export {
  type FormatRelativeAgeOptions,
  formatRelativeAge,
  formatRelativeAgeSince,
  RELATIVE_AGE_NARROW,
  type RelativeAgeNegative,
  type RelativeAgeTimestamp,
} from "./utils/format-relative-age.js";
export type { HeadingLevel } from "./utils/heading.js";
export type { SemanticTone, StatusTone } from "./utils/tone.js";
export type {
  Density,
  LegacyDensity,
  Orientation,
} from "./utils/variants.js";
export { PACKAGE_VERSION } from "./version.js";

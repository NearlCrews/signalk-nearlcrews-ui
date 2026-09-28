/**
 * What a typical consumer panel imports: every name at least five of the six
 * published Signal K panels import from this package. The bundle size check
 * builds this file the way a remote is built, with tree shaking and React
 * external, so its row in the size table is what a panel remote actually
 * pays rather than the sum of whole entry points. Change the list when the
 * consumers' common imports change, and record the new measurement.
 */
export {
  Badge,
  Banner,
  Button,
  Checkbox,
  Cluster,
  CollapsibleSection,
  LabeledField,
  NumberField,
  PanelShell,
  RelativeAge,
  Section,
  Select,
  Stack,
  StatusIndicator,
  Text,
  TextInput,
  useUnsavedChangesGuard,
} from "signalk-nearlcrews-ui";
export { SaveActionBar } from "signalk-nearlcrews-ui/composites";

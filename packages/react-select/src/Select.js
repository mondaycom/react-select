import React, { Component } from 'react';
import memoizeOne from 'memoize-one';
import { MenuPlacer } from './components/Menu';
import isEqual from './internal/react-fast-compare';

import { createFilter } from './filters';
import {
  A11yText,
  DummyInput,
  ScrollBlock,
  ScrollCaptor,
} from './internal/index';
import {
  valueFocusAriaMessage,
  optionFocusAriaMessage,
  resultsAriaMessage,
  valueEventAriaMessage,
  instructionsAriaMessage,
} from './accessibility/index';

import {
  classNames,
  cleanValue,
  isTouchCapable,
  isMobileDevice,
  noop,
  scrollIntoView,
  isDocumentElement,
} from './utils';

import {
  formatGroupLabel,
  getOptionLabel,
  getOptionValue,
  isOptionDisabled,
} from './builtins';

import { defaultComponents } from './components/index';

import { defaultStyles } from './styles';
import { defaultTheme } from './theme';

export const defaultProps = {
  backspaceRemovesValue: true,
  blurInputOnSelect: isTouchCapable(),
  captureMenuScroll: !isTouchCapable(),
  closeMenuOnSelect: true,
  closeMenuOnScroll: false,
  components: {},
  controlShouldRenderValue: true,
  escapeClearsValue: false,
  filterOption: createFilter(),
  formatGroupLabel: formatGroupLabel,
  getOptionLabel: getOptionLabel,
  getOptionValue: getOptionValue,
  isDisabled: false,
  isLoading: false,
  isMulti: false,
  isRtl: false,
  isSearchable: true,
  isOptionDisabled: isOptionDisabled,
  loadingMessage: () => 'Loading...',
  maxMenuHeight: 300,
  minMenuHeight: 140,
  menuIsOpen: false,
  menuPlacement: 'bottom',
  menuPosition: 'absolute',
  menuShouldBlockScroll: false,
  menuShouldScrollIntoView: !isMobileDevice(),
  noOptionsMessage: () => 'No options',
  openMenuOnFocus: false,
  openMenuOnClick: true,
  options: [],
  pageSize: 5,
  placeholder: 'Select...',
  screenReaderStatus: ({ count }) =>
    `${count} result${count !== 1 ? 's' : ''} available`,
  styles: {},
  tabIndex: '0',
  tabSelectsValue: true,
};

let instanceId = 1;

export default class Select extends Component {
  static defaultProps = defaultProps;
  state = {
    ariaLiveSelection: '',
    ariaLiveContext: '',
    focusedOption: null,
    focusedValue: null,
    inputIsHidden: false,
    isFocused: false,
    menuOptions: { render: [], focusable: [] },
    selectValue: [],
  };

  // Misc. Instance Properties
  // ------------------------------

  blockOptionHover = false;
  isComposing = false;
  clearFocusValueOnUpdate = false;
  commonProps; // TODO
  components;
  hasGroups = false;
  initialTouchX = 0;
  initialTouchY = 0;
  inputIsHiddenAfterUpdate;
  instancePrefix = '';
  openAfterFocus = false;
  scrollToFocusedOptionOnUpdate = false;
  userIsDragging;

  // Refs
  // ------------------------------

  controlRef = null;
  getControlRef = ref => {
    this.controlRef = ref;
  };
  focusedOptionRef = null;
  getFocusedOptionRef = ref => {
    this.focusedOptionRef = ref;
  };
  menuListRef = null;
  getMenuListRef = ref => {
    this.menuListRef = ref;
  };
  inputRef = null;
  getInputRef = ref => {
    this.inputRef = ref;
  };

  // Lifecycle
  // ------------------------------

  constructor(props) {
    super(props);
    const { value } = props;
    this.cacheComponents = memoizeOne(this.cacheComponents, isEqual).bind(this);
    this.cacheComponents(props.components);
    this.instancePrefix =
      'react-select-' + (this.props.instanceId || ++instanceId);

    const selectValue = cleanValue(value);

    this.buildMenuOptions = memoizeOne(
      this.buildMenuOptions,
      (newArgs, lastArgs) => {
        const [newProps, newSelectValue] = newArgs;
        const [lastProps, lastSelectValue] = lastArgs;

        return (
          newSelectValue === lastSelectValue &&
          newProps.inputValue === lastProps.inputValue &&
          newProps.options === lastProps.options
        );
      }
    ).bind(this);
    const menuOptions = props.menuIsOpen
      ? this.buildMenuOptions(props, selectValue)
      : { render: [], focusable: [] };

    this.state.menuOptions = menuOptions;
    this.state.selectValue = selectValue;
  }
  componentDidMount() {
    this.startListeningComposition();
    this.startListeningToTouch();

    if (this.props.closeMenuOnScroll && document && document.addEventListener) {
      // Listen to all scroll events, and filter them out inside of 'onScroll'
      document.addEventListener('scroll', this.onScroll, true);
    }

    if (this.props.autoFocus) {
      this.focusInput();
    }
  }
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { options, value, menuIsOpen, inputValue } = this.props;
    // re-cache custom components
    this.cacheComponents(nextProps.components);
    // rebuild the menu options
    if (
      nextProps.value !== value ||
      nextProps.options !== options ||
      nextProps.menuIsOpen !== menuIsOpen ||
      nextProps.inputValue !== inputValue
    ) {
      const selectValue = cleanValue(nextProps.value);
      const menuOptions = nextProps.menuIsOpen
        ? this.buildMenuOptions(nextProps, selectValue)
        : { render: [], focusable: [] };
      const focusedValue = this.getNextFocusedValue(selectValue);
      const focusedOption = this.getNextFocusedOption(menuOptions.focusable);
      this.setState({ menuOptions, selectValue, focusedOption, focusedValue });
    }
    // some updates should toggle the state of the input visibility
    if (this.inputIsHiddenAfterUpdate != null) {
      this.setState({
        inputIsHidden: this.inputIsHiddenAfterUpdate,
      });
      delete this.inputIsHiddenAfterUpdate;
    }
  }
  componentDidUpdate(prevProps) {
    const { isDisabled, menuIsOpen } = this.props;
    const { isFocused } = this.state;

    if (
      // ensure focus is restored correctly when the control becomes enabled
      (isFocused && !isDisabled && prevProps.isDisabled) ||
      // ensure focus is on the Input when the menu opens
      (isFocused && menuIsOpen && !prevProps.menuIsOpen)
    ) {
      this.focusInput();
    }

    if (isFocused && isDisabled && !prevProps.isDisabled) {
      // ensure select state gets blurred in case Select is programatically disabled while focused
      this.setState({ isFocused: false }, this.onMenuClose);
    }

    // scroll the focused option into view if necessary
    if (
      this.menuListRef &&
      this.focusedOptionRef &&
      this.scrollToFocusedOptionOnUpdate
    ) {
      scrollIntoView(this.menuListRef, this.focusedOptionRef);
      this.scrollToFocusedOptionOnUpdate = false;
    }
  }
  componentWillUnmount() {
    this.stopListeningComposition();
    this.stopListeningToTouch();
    document.removeEventListener('scroll', this.onScroll, true);
  }
  cacheComponents = components => {
    this.components = defaultComponents({ components });
  };
  // ==============================
  // Consumer Handlers
  // ==============================

  onMenuOpen() {
    this.props.onMenuOpen();
  }
  onMenuClose() {
    const { isSearchable, isMulti } = this.props;
    this.announceAriaLiveContext({
      event: 'input',
      context: { isSearchable, isMulti },
    });
    this.onInputChange('', { action: 'menu-close' });
    this.props.onMenuClose();
  }
  onInputChange(newValue, actionMeta) {
    this.props.onInputChange(newValue, actionMeta);
  }

  // ==============================
  // Methods
  // ==============================

  focusInput() {
    if (!this.inputRef) return;
    this.inputRef.focus();
  }
  blurInput() {
    if (!this.inputRef) return;
    this.inputRef.blur();
  }

  // aliased for consumers
  focus = this.focusInput;
  blur = this.blurInput;

  openMenu(focusOption) {
    const { selectValue, isFocused } = this.state;
    const menuOptions = this.buildMenuOptions(this.props, selectValue);
    const { isMulti, tabSelectsValue } = this.props;
    let openAtIndex =
      focusOption === 'first' ? 0 : menuOptions.focusable.length - 1;

    if (!isMulti) {
      const selectedIndex = menuOptions.focusable.indexOf(selectValue[0]);
      if (selectedIndex > -1) {
        openAtIndex = selectedIndex;
      }
    }

    // only scroll if the menu isn't already open
    this.scrollToFocusedOptionOnUpdate = !(isFocused && this.menuListRef);
    this.inputIsHiddenAfterUpdate = false;

    this.setState(
      {
        menuOptions,
        focusedValue: null,
        focusedOption: menuOptions.focusable[openAtIndex],
      },
      () => {
        this.onMenuOpen();
        this.announceAriaLiveContext({
          event: 'menu',
          context: { tabSelectsValue },
        });
      }
    );
  }
  focusValue(direction) {
    const { isMulti, isSearchable } = this.props;
    const { selectValue, focusedValue } = this.state;

    // Only multiselects support value focusing
    if (!isMulti) return;

    this.setState({
      focusedOption: null,
    });

    let focusedIndex = selectValue.indexOf(focusedValue);
    if (!focusedValue) {
      focusedIndex = -1;
      this.announceAriaLiveContext({ event: 'value' });
    }

    const lastIndex = selectValue.length - 1;
    let nextFocus = -1;
    if (!selectValue.length) return;

    switch (direction) {
      case 'previous':
        if (focusedIndex === 0) {
          // don't cycle from the start to the end
          nextFocus = 0;
        } else if (focusedIndex === -1) {
          // if nothing is focused, focus the last value first
          nextFocus = lastIndex;
        } else {
          nextFocus = focusedIndex - 1;
        }
        break;
      case 'next':
        if (focusedIndex > -1 && focusedIndex < lastIndex) {
          nextFocus = focusedIndex + 1;
        }
        break;
    }

    if (nextFocus === -1) {
      this.announceAriaLiveContext({
        event: 'input',
        context: { isSearchable, isMulti },
      });
    }

    this.setState({
      inputIsHidden: nextFocus !== -1,
      focusedValue: selectValue[nextFocus],
    });
  }

  focusOption(direction = 'first') {
    const { pageSize, tabSelectsValue } = this.props;
    const { focusedOption, menuOptions } = this.state;
    const options = menuOptions.focusable;

    if (!options.length) return;
    let nextFocus = 0; // handles 'first'
    let focusedIndex = options.indexOf(focusedOption);
    if (!focusedOption) {
      focusedIndex = -1;
      this.announceAriaLiveContext({
        event: 'menu',
        context: { tabSelectsValue },
      });
    }

    if (direction === 'up') {
      nextFocus = focusedIndex > 0 ? focusedIndex - 1 : options.length - 1;
    } else if (direction === 'down') {
      nextFocus = (focusedIndex + 1) % options.length;
    } else if (direction === 'pageup') {
      nextFocus = focusedIndex - pageSize;
      if (nextFocus < 0) nextFocus = 0;
    } else if (direction === 'pagedown') {
      nextFocus = focusedIndex + pageSize;
      if (nextFocus > options.length - 1) nextFocus = options.length - 1;
    } else if (direction === 'last') {
      nextFocus = options.length - 1;
    }
    this.scrollToFocusedOptionOnUpdate = true;
    this.setState({
      focusedOption: options[nextFocus],
      focusedValue: null,
    });
    this.announceAriaLiveContext({
      event: 'menu',
      context: {
        isDisabled: isOptionDisabled(options[nextFocus]),
        tabSelectsValue,
      },
    });
  }
  onChange = (newValue, actionMeta) => {
    const { onChange, name } = this.props;
    onChange(newValue, { ...actionMeta, name });
  };
  setValue = (newValue, action = 'set-value', option) => {
    const { closeMenuOnSelect, isMulti } = this.props;
    this.onInputChange('', { action: 'set-value' });
    if (closeMenuOnSelect) {
      this.inputIsHiddenAfterUpdate = !isMulti;
      this.onMenuClose();
    }
    // when the select value should change, we should reset focusedValue
    this.clearFocusValueOnUpdate = true;
    this.onChange(newValue, { action, option });
  };
  selectOption = newValue => {
    const { blurInputOnSelect, isMulti } = this.props;
    const { selectValue } = this.state;

    if (isMulti) {
      if (this.isOptionSelected(newValue, selectValue)) {
        const candidate = this.getOptionValue(newValue);
        this.setValue(
          selectValue.filter(i => this.getOptionValue(i) !== candidate),
          'deselect-option',
          newValue
        );
        this.announceAriaLiveSelection({
          event: 'deselect-option',
          context: { value: this.getOptionLabel(newValue) },
        });
      } else {
        if (!this.isOptionDisabled(newValue, selectValue)) {
          this.setValue([...selectValue, newValue], 'select-option', newValue);
          this.announceAriaLiveSelection({
            event: 'select-option',
            context: { value: this.getOptionLabel(newValue) },
          });
        } else {
          // announce that option is disabled
          this.announceAriaLiveSelection({
            event: 'select-option',
            context: { value: this.getOptionLabel(newValue), isDisabled: true },
          });
        }
      }
    } else {
      if (!this.isOptionDisabled(newValue, selectValue)) {
        this.setValue(newValue, 'select-option');
        this.announceAriaLiveSelection({
          event: 'select-option',
          context: { value: this.getOptionLabel(newValue) },
        });
      } else {
        // announce that option is disabled
        this.announceAriaLiveSelection({
          event: 'select-option',
          context: { value: this.getOptionLabel(newValue), isDisabled: true },
        });
      }
    }

    if (blurInputOnSelect) {
      this.blurInput();
    }
  };
  removeValue = removedValue => {
    const { selectValue } = this.state;
    const candidate = this.getOptionValue(removedValue);
    const newValue = selectValue.filter(
      i => this.getOptionValue(i) !== candidate
    );
    this.onChange(newValue.length ? newValue : null, {
      action: 'remove-value',
      removedValue,
    });
    this.announceAriaLiveSelection({
      event: 'remove-value',
      context: {
        value: removedValue ? this.getOptionLabel(removedValue) : '',
      },
    });
    this.focusInput();
  };
  clearValue = () => {
    this.onChange(null, { action: 'clear' });
  };
  popValue = () => {
    const { selectValue } = this.state;
    const lastSelectedValue = selectValue[selectValue.length - 1];
    const newValue = selectValue.slice(0, selectValue.length - 1);
    this.announceAriaLiveSelection({
      event: 'pop-value',
      context: {
        value: lastSelectedValue ? this.getOptionLabel(lastSelectedValue) : '',
      },
    });
    this.onChange(newValue.length ? newValue : null, {
      action: 'pop-value',
      removedValue: lastSelectedValue,
    });
  };

  // ==============================
  // Getters
  // ==============================

  getTheme() {
    // Use the default theme if there are no customizations.
    if (!this.props.theme) {
      return defaultTheme;
    }
    // If the theme prop is a function, assume the function
    // knows how to merge the passed-in default theme with
    // its own modifications.
    if (typeof this.props.theme === 'function') {
      return this.props.theme(defaultTheme);
    }
    // Otherwise, if a plain theme object was passed in,
    // overlay it with the default theme.
    return {
      ...defaultTheme,
      ...this.props.theme,
    };
  }

  getValue = () => this.state.selectValue;

  cx = (...args) => classNames(this.props.classNamePrefix, ...args);

  getCommonProps() {
    const {
      clearValue,
      cx,
      getStyles,
      getValue,
      setValue,
      selectOption,
      props,
    } = this;
    const { isMulti, isRtl, options } = props;
    const hasValue = this.hasValue();

    return {
      cx,
      clearValue,
      getStyles,
      getValue,
      hasValue,
      isMulti,
      isRtl,
      options,
      selectOption,
      setValue,
      selectProps: props,
      theme: this.getTheme(),
    };
  }

  getNextFocusedValue(nextSelectValue) {
    if (this.clearFocusValueOnUpdate) {
      this.clearFocusValueOnUpdate = false;
      return null;
    }
    const { focusedValue, selectValue: lastSelectValue } = this.state;
    const lastFocusedIndex = lastSelectValue.indexOf(focusedValue);
    if (lastFocusedIndex > -1) {
      const nextFocusedIndex = nextSelectValue.indexOf(focusedValue);
      if (nextFocusedIndex > -1) {
        // the focused value is still in the selectValue, return it
        return focusedValue;
      } else if (lastFocusedIndex < nextSelectValue.length) {
        // the focusedValue is not present in the next selectValue array by
        // reference, so return the new value at the same index
        return nextSelectValue[lastFocusedIndex];
      }
    }
    return null;
  }

  getNextFocusedOption(options) {
    const { focusedOption: lastFocusedOption } = this.state;
    return lastFocusedOption && options.indexOf(lastFocusedOption) > -1
      ? lastFocusedOption
      : options[0];
  }
  getOptionLabel = data => {
    return this.props.getOptionLabel(data);
  };
  getOptionValue = data => {
    return this.props.getOptionValue(data);
  };
  getStyles = (key, props) => {
    const base = defaultStyles[key](props);
    base.boxSizing = 'border-box';
    const custom = this.props.styles[key];
    return custom ? custom(base, props) : base;
  };
  getElementId = element => {
    return `${this.instancePrefix}-${element}`;
  };
  getActiveDescendentId = () => {
    const { menuIsOpen } = this.props;
    const { menuOptions, focusedOption } = this.state;

    if (!focusedOption || !menuIsOpen) return undefined;

    const index = menuOptions.focusable.indexOf(focusedOption);
    const option = menuOptions.render[index];

    return option && option.key;
  };

  // ==============================
  // Helpers
  // ==============================
  announceAriaLiveSelection = ({ event, context }) => {
    this.setState({
      ariaLiveSelection: valueEventAriaMessage(event, context),
    });
  };
  announceAriaLiveContext = ({ event, context }) => {
    this.setState({
      ariaLiveContext: instructionsAriaMessage(event, {
        ...context,
        label: this.props['aria-label'],
      }),
    });
  };

  hasValue() {
    const { selectValue } = this.state;
    return selectValue.length > 0;
  }
  hasOptions() {
    return !!this.state.menuOptions.render.length;
  }
  countOptions() {
    return this.state.menuOptions.focusable.length;
  }
  isClearable() {
    const { isClearable, isMulti } = this.props;

    // single select, by default, IS NOT clearable
    // multi select, by default, IS clearable
    if (isClearable === undefined) return isMulti;

    return isClearable;
  }
  isOptionDisabled(option, selectValue) {
    return typeof this.props.isOptionDisabled === 'function'
      ? this.props.isOptionDisabled(option, selectValue)
      : false;
  }
  isOptionSelected(option, selectValue) {
    if (selectValue.indexOf(option) > -1) return true;
    if (typeof this.props.isOptionSelected === 'function') {
      return this.props.isOptionSelected(option, selectValue);
    }
    const candidate = this.getOptionValue(option);
    return selectValue.some(i => this.getOptionValue(i) === candidate);
  }
  filterOption(option, inputValue) {
    return this.props.filterOption
      ? this.props.filterOption(option, inputValue)
      : true;
  }
  formatOptionLabel(data, context) {
    if (typeof this.props.formatOptionLabel === 'function') {
      const { inputValue } = this.props;
      const { selectValue } = this.state;
      return this.props.formatOptionLabel(data, {
        context,
        inputValue,
        selectValue,
      });
    } else {
      return this.getOptionLabel(data);
    }
  }
  formatGroupLabel(data) {
    return this.props.formatGroupLabel(data);
  }

  // ==============================
  // Mouse Handlers
  // ==============================

  onMenuMouseDown = event => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.focusInput();
  };
  onMenuMouseMove = event => {
    this.blockOptionHover = false;
  };
  onControlMouseDown = event => {
    const { openMenuOnClick } = this.props;
    if (!this.state.isFocused) {
      if (openMenuOnClick) {
        this.openAfterFocus = true;
      }
      this.focusInput();
    } else if (!this.props.menuIsOpen) {
      if (openMenuOnClick) {
        this.openMenu('first');
      }
    } else {
      if (
        // $FlowFixMe
        event.target.tagName !== 'INPUT' &&
        event.target.tagName !== 'TEXTAREA'
      ) {
        this.onMenuClose();
      }
    }
    if (
      // $FlowFixMe
      event.target.tagName !== 'INPUT' &&
      event.target.tagName !== 'TEXTAREA'
    ) {
      event.preventDefault();
    }
  };
  onDropdownIndicatorMouseDown = event => {
    // ignore mouse events that weren't triggered by the primary button
    if (event && event.type === 'mousedown' && event.button !== 0) {
      return;
    }
    if (this.props.isDisabled) return;
    const { isMulti, menuIsOpen } = this.props;
    this.focusInput();
    if (menuIsOpen) {
      this.inputIsHiddenAfterUpdate = !isMulti;
      this.onMenuClose();
    } else {
      this.openMenu('first');
    }
    event.preventDefault();
    event.stopPropagation();
  };
  onClearIndicatorMouseDown = event => {
    // ignore mouse events that weren't triggered by the primary button
    if (event && event.type === 'mousedown' && event.button !== 0) {
      return;
    }
    this.clearValue();
    event.stopPropagation();
    this.openAfterFocus = false;
    if (event.type === 'touchend') {
      this.focusInput();
    } else {
      setTimeout(() => this.focusInput());
    }
  };
  onScroll = event => {
    if (typeof this.props.closeMenuOnScroll === 'boolean') {
      if (
        event.target instanceof HTMLElement &&
        isDocumentElement(event.target)
      ) {
        this.props.onMenuClose();
      }
    } else if (typeof this.props.closeMenuOnScroll === 'function') {
      if (this.props.closeMenuOnScroll(event)) {
        this.props.onMenuClose();
      }
    }
  };

  // ==============================
  // Composition Handlers
  // ==============================

  startListeningComposition() {
    if (document && document.addEventListener) {
      document.addEventListener(
        'compositionstart',
        this.onCompositionStart,
        false
      );
      document.addEventListener('compositionend', this.onCompositionEnd, false);
    }
  }
  stopListeningComposition() {
    if (document && document.removeEventListener) {
      document.removeEventListener('compositionstart', this.onCompositionStart);
      document.removeEventListener('compositionend', this.onCompositionEnd);
    }
  }
  onCompositionStart = () => {
    this.isComposing = true;
  };
  onCompositionEnd = () => {
    this.isComposing = false;
  };

  // ==============================
  // Touch Handlers
  // ==============================

  startListeningToTouch() {
    if (document && document.addEventListener) {
      document.addEventListener('touchstart', this.onTouchStart, false);
      document.addEventListener('touchmove', this.onTouchMove, false);
      document.addEventListener('touchend', this.onTouchEnd, false);
    }
  }
  stopListeningToTouch() {
    if (document && document.removeEventListener) {
      document.removeEventListener('touchstart', this.onTouchStart);
      document.removeEventListener('touchmove', this.onTouchMove);
      document.removeEventListener('touchend', this.onTouchEnd);
    }
  }
  onTouchStart = ({ touches }) => {
    const touch = touches && touches.item(0);
    if (!touch) {
      return;
    }

    this.initialTouchX = touch.clientX;
    this.initialTouchY = touch.clientY;
    this.userIsDragging = false;
  };
  onTouchMove = ({ touches }) => {
    const touch = touches && touches.item(0);
    if (!touch) {
      return;
    }

    const deltaX = Math.abs(touch.clientX - this.initialTouchX);
    const deltaY = Math.abs(touch.clientY - this.initialTouchY);
    const moveThreshold = 5;

    this.userIsDragging = deltaX > moveThreshold || deltaY > moveThreshold;
  };
  onTouchEnd = event => {
    if (this.userIsDragging) return;

    // close the menu if the user taps outside
    // we're checking on event.target here instead of event.currentTarget, because we want to assert information
    // on events on child elements, not the document (which we've attached this handler to).
    if (
      this.controlRef &&
      !this.controlRef.contains(event.target) &&
      this.menuListRef &&
      !this.menuListRef.contains(event.target)
    ) {
      this.blurInput();
    }

    // reset move vars
    this.initialTouchX = 0;
    this.initialTouchY = 0;
  };
  onControlTouchEnd = event => {
    if (this.userIsDragging) return;
    this.onControlMouseDown(event);
  };
  onClearIndicatorTouchEnd = event => {
    if (this.userIsDragging) return;

    this.onClearIndicatorMouseDown(event);
  };
  onDropdownIndicatorTouchEnd = event => {
    if (this.userIsDragging) return;

    this.onDropdownIndicatorMouseDown(event);
  };

  // ==============================
  // Focus Handlers
  // ==============================

  handleInputChange = event => {
    const inputValue = event.currentTarget.value;
    this.inputIsHiddenAfterUpdate = false;
    this.onInputChange(inputValue, { action: 'input-change' });
    if (!this.props.menuIsOpen) {
      this.onMenuOpen();
    }
  };
  onInputFocus = event => {
    const { isSearchable, isMulti } = this.props;
    if (this.props.onFocus) {
      this.props.onFocus(event);
    }
    this.inputIsHiddenAfterUpdate = false;
    this.announceAriaLiveContext({
      event: 'input',
      context: { isSearchable, isMulti },
    });
    this.setState({
      isFocused: true,
    });
    if (this.openAfterFocus || this.props.openMenuOnFocus) {
      this.openMenu('first');
    }
    this.openAfterFocus = false;
  };
  onInputBlur = event => {
    if (this.menuListRef && this.menuListRef.contains(document.activeElement)) {
      this.inputRef.focus();
      return;
    }
    if (this.props.onBlur) {
      this.props.onBlur(event);
    }
    this.onInputChange('', { action: 'input-blur' });
    this.onMenuClose();
    this.setState({
      focusedValue: null,
      isFocused: false,
    });
  };
  onOptionHover = focusedOption => {
    if (this.blockOptionHover || this.state.focusedOption === focusedOption) {
      return;
    }
    this.setState({ focusedOption });
  };
  shouldHideSelectedOptions = () => {
    const { hideSelectedOptions, isMulti } = this.props;
    if (hideSelectedOptions === undefined) return isMulti;
    return hideSelectedOptions;
  };

  // ==============================
  // Keyboard Handlers
  // ==============================

  onKeyDown = event => {
    const {
      isMulti,
      backspaceRemovesValue,
      escapeClearsValue,
      inputValue,
      isClearable,
      isDisabled,
      menuIsOpen,
      onKeyDown,
      tabSelectsValue,
      openMenuOnFocus,
    } = this.props;
    const { focusedOption, focusedValue, selectValue } = this.state;

    if (isDisabled) return;

    if (typeof onKeyDown === 'function') {
      onKeyDown(event);
      if (event.defaultPrevented) {
        return;
      }
    }

    // Block option hover events when the user has just pressed a key
    this.blockOptionHover = true;
    switch (event.key) {
      case 'ArrowLeft':
        if (!isMulti || inputValue) return;
        this.focusValue('previous');
        break;
      case 'ArrowRight':
        if (!isMulti || inputValue) return;
        this.focusValue('next');
        break;
      case 'Delete':
      case 'Backspace':
        if (inputValue) return;
        if (focusedValue) {
          this.removeValue(focusedValue);
        } else {
          if (!backspaceRemovesValue) return;
          if (isMulti) {
            this.popValue();
          } else if (isClearable) {
            this.clearValue();
          }
        }
        break;
      case 'Tab':
        if (this.isComposing) return;

        if (
          event.shiftKey ||
          !menuIsOpen ||
          !tabSelectsValue ||
          !focusedOption ||
          // don't capture the event if the menu opens on focus and the focused
          // option is already selected; it breaks the flow of navigation
          (openMenuOnFocus && this.isOptionSelected(focusedOption, selectValue))
        ) {
          return;
        }
        this.selectOption(focusedOption);
        break;
      case 'Enter':
        if (event.keyCode === 229) {
          // ignore the keydown event from an Input Method Editor(IME)
          // ref. https://www.w3.org/TR/uievents/#determine-keydown-keyup-keyCode
          break;
        }
        if (menuIsOpen) {
          if (!focusedOption) return;
          if (this.isComposing) return;
          this.selectOption(focusedOption);
          break;
        }
        return;
      case 'Escape':
        if (menuIsOpen) {
          this.inputIsHiddenAfterUpdate = false;
          this.onInputChange('', { action: 'menu-close' });
          this.onMenuClose();
        } else if (isClearable && escapeClearsValue) {
          this.clearValue();
        }
        break;
      case ' ': // space
        if (inputValue) {
          return;
        }
        if (!menuIsOpen) {
          this.openMenu('first');
          break;
        }
        if (!focusedOption) return;
        this.selectOption(focusedOption);
        break;
      case 'ArrowUp':
        if (menuIsOpen) {
          this.focusOption('up');
        } else {
          this.openMenu('last');
        }
        break;
      case 'ArrowDown':
        if (menuIsOpen) {
          this.focusOption('down');
        } else {
          this.openMenu('first');
        }
        break;
      case 'PageUp':
        if (!menuIsOpen) return;
        this.focusOption('pageup');
        break;
      case 'PageDown':
        if (!menuIsOpen) return;
        this.focusOption('pagedown');
        break;
      case 'Home':
        if (!menuIsOpen) return;
        this.focusOption('first');
        break;
      case 'End':
        if (!menuIsOpen) return;
        this.focusOption('last');
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  // ==============================
  // Menu Options
  // ==============================

  buildMenuOptions = (props, selectValue) => {
    const { inputValue = '', options } = props;

    const toOption = (option, id) => {
      const isDisabled = this.isOptionDisabled(option, selectValue);
      const isSelected = this.isOptionSelected(option, selectValue);
      const label = this.getOptionLabel(option);
      const value = this.getOptionValue(option);

      if (
        (this.shouldHideSelectedOptions() && isSelected) ||
        !this.filterOption({ label, value, data: option }, inputValue)
      ) {
        return;
      }

      const onHover = isDisabled ? undefined : () => this.onOptionHover(option);
      const onSelect = isDisabled ? undefined : () => this.selectOption(option);
      const optionId = `${this.getElementId('option')}-${id}`;

      return {
        innerProps: {
          id: optionId,
          onClick: onSelect,
          onMouseMove: onHover,
          onMouseOver: onHover,
          tabIndex: -1,
        },
        data: option,
        isDisabled,
        isSelected,
        key: optionId,
        label,
        type: 'option',
        value,
      };
    };

    return options.reduce(
      (acc, item, itemIndex) => {
        if (item.options) {
          // TODO needs a tidier implementation
          if (!this.hasGroups) this.hasGroups = true;

          const { options: items } = item;
          const children = items
            .map((child, i) => {
              const option = toOption(child, `${itemIndex}-${i}`);
              if (option) acc.focusable.push(child);
              return option;
            })
            .filter(Boolean);
          if (children.length) {
            const groupId = `${this.getElementId('group')}-${itemIndex}`;
            acc.render.push({
              type: 'group',
              key: groupId,
              data: item,
              options: children,
            });
          }
        } else {
          const option = toOption(item, `${itemIndex}`);
          if (option) {
            acc.render.push(option);
            acc.focusable.push(item);
          }
        }
        return acc;
      },
      { render: [], focusable: [] }
    );
  };

  // ==============================
  // Renderers
  // ==============================
  constructAriaLiveMessage() {
    const {
      ariaLiveContext,
      selectValue,
      focusedValue,
      focusedOption,
    } = this.state;
    const { options, menuIsOpen, inputValue, screenReaderStatus } = this.props;

    // An aria live message representing the currently focused value in the select.
    const focusedValueMsg = focusedValue
      ? valueFocusAriaMessage({
          focusedValue,
          getOptionLabel: this.getOptionLabel,
          selectValue,
        })
      : '';
    // An aria live message representing the currently focused option in the select.
    const focusedOptionMsg =
      focusedOption && menuIsOpen
        ? optionFocusAriaMessage({
            focusedOption,
            getOptionLabel: this.getOptionLabel,
            options,
          })
        : '';
    // An aria live message representing the set of focusable results and current searchterm/inputvalue.
    const resultsMsg = resultsAriaMessage({
      inputValue,
      screenReaderMessage: screenReaderStatus({ count: this.countOptions() }),
    });

    return `${focusedValueMsg} ${focusedOptionMsg} ${resultsMsg} ${ariaLiveContext}`;
  }

  renderInput() {
    const {
      isDisabled,
      isSearchable,
      inputId,
      inputValue,
      tabIndex,
      form,
    } = this.props;
    const { Input } = this.components;
    const { inputIsHidden } = this.state;

    const id = inputId || this.getElementId('input');

    // aria attributes makes the JSX "noisy", separated for clarity
    const ariaAttributes = {
      'aria-autocomplete': 'list',
      'aria-label': this.props['aria-label'],
      'aria-labelledby': this.props['aria-labelledby'],
    };

    if (!isSearchable) {
      // use a dummy input to maintain focus/blur functionality
      return (
        <DummyInput
          id={id}
          innerRef={this.getInputRef}
          onBlur={this.onInputBlur}
          onChange={noop}
          onFocus={this.onInputFocus}
          readOnly
          disabled={isDisabled}
          tabIndex={tabIndex}
          form={form}
          value=""
          {...ariaAttributes}
        />
      );
    }

    const { cx, theme, selectProps } = this.commonProps;

    return (
      <Input
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        cx={cx}
        getStyles={this.getStyles}
        id={id}
        innerRef={this.getInputRef}
        isDisabled={isDisabled}
        isHidden={inputIsHidden}
        onBlur={this.onInputBlur}
        onChange={this.handleInputChange}
        onFocus={this.onInputFocus}
        selectProps={selectProps}
        spellCheck="false"
        tabIndex={tabIndex}
        form={form}
        theme={theme}
        type="text"
        value={inputValue}
        {...ariaAttributes}
      />
    );
  }
  renderPlaceholderOrValue() {
    const {
      MultiValue,
      MultiValueContainer,
      MultiValueLabel,
      MultiValueRemove,
      SingleValue,
      Placeholder,
    } = this.components;
    const { commonProps } = this;
    const {
      controlShouldRenderValue,
      isDisabled,
      isMulti,
      inputValue,
      placeholder,
    } = this.props;
    const { selectValue, focusedValue, isFocused } = this.state;

    if (!this.hasValue() || !controlShouldRenderValue) {
      return inputValue ? null : (
        <Placeholder
          {...commonProps}
          key="placeholder"
          isDisabled={isDisabled}
          isFocused={isFocused}
        >
          {placeholder}
        </Placeholder>
      );
    }

    if (isMulti) {
      const selectValues = selectValue.map((opt, index) => {
        const isOptionFocused = opt === focusedValue;

        return (
          <MultiValue
            {...commonProps}
            components={{
              Container: MultiValueContainer,
              Label: MultiValueLabel,
              Remove: MultiValueRemove,
            }}
            isFocused={isOptionFocused}
            isDisabled={isDisabled}
            key={`${this.getOptionValue(opt)}${index}`}
            index={index}
            removeProps={{
              onClick: () => this.removeValue(opt),
              onTouchEnd: () => this.removeValue(opt),
              onMouseDown: e => {
                e.preventDefault();
                e.stopPropagation();
              },
            }}
            data={opt}
          >
            {this.formatOptionLabel(opt, 'value')}
          </MultiValue>
        );
      });
      return selectValues;
    }

    if (inputValue) {
      return null;
    }

    const singleValue = selectValue[0];
    return (
      <SingleValue {...commonProps} data={singleValue} isDisabled={isDisabled}>
        {this.formatOptionLabel(singleValue, 'value')}
      </SingleValue>
    );
  }
  renderClearIndicator() {
    const { ClearIndicator } = this.components;
    const { commonProps } = this;
    const { isDisabled, isLoading } = this.props;
    const { isFocused } = this.state;

    if (
      !this.isClearable() ||
      !ClearIndicator ||
      isDisabled ||
      !this.hasValue() ||
      isLoading
    ) {
      return null;
    }

    const innerProps = {
      onMouseDown: this.onClearIndicatorMouseDown,
      onTouchEnd: this.onClearIndicatorTouchEnd,
      'aria-hidden': 'true',
    };

    return (
      <ClearIndicator
        {...commonProps}
        innerProps={innerProps}
        isFocused={isFocused}
      />
    );
  }
  renderLoadingIndicator() {
    const { LoadingIndicator } = this.components;
    const { commonProps } = this;
    const { isDisabled, isLoading } = this.props;
    const { isFocused } = this.state;

    if (!LoadingIndicator || !isLoading) return null;

    const innerProps = { 'aria-hidden': 'true' };
    return (
      <LoadingIndicator
        {...commonProps}
        innerProps={innerProps}
        isDisabled={isDisabled}
        isFocused={isFocused}
      />
    );
  }
  renderIndicatorSeparator() {
    const { DropdownIndicator, IndicatorSeparator } = this.components;

    // separator doesn't make sense without the dropdown indicator
    if (!DropdownIndicator || !IndicatorSeparator) return null;

    const { commonProps } = this;
    const { isDisabled } = this.props;
    const { isFocused } = this.state;

    return (
      <IndicatorSeparator
        {...commonProps}
        isDisabled={isDisabled}
        isFocused={isFocused}
      />
    );
  }
  renderDropdownIndicator() {
    const { DropdownIndicator } = this.components;
    if (!DropdownIndicator) return null;
    const { commonProps } = this;
    const { isDisabled } = this.props;
    const { isFocused } = this.state;

    const innerProps = {
      onMouseDown: this.onDropdownIndicatorMouseDown,
      onTouchEnd: this.onDropdownIndicatorTouchEnd,
      'aria-hidden': 'true',
    };

    return (
      <DropdownIndicator
        {...commonProps}
        innerProps={innerProps}
        isDisabled={isDisabled}
        isFocused={isFocused}
      />
    );
  }
  renderMenu() {
    const {
      Group,
      GroupHeading,
      Menu,
      MenuList,
      MenuPortal,
      LoadingMessage,
      NoOptionsMessage,
      Option,
    } = this.components;
    const { commonProps } = this;
    const { focusedOption, menuOptions } = this.state;
    const {
      captureMenuScroll,
      inputValue,
      isLoading,
      loadingMessage,
      minMenuHeight,
      maxMenuHeight,
      menuIsOpen,
      menuPlacement,
      menuPosition,
      menuPortalTarget,
      menuShouldBlockScroll,
      menuShouldScrollIntoView,
      noOptionsMessage,
      onMenuScrollToTop,
      onMenuScrollToBottom,
    } = this.props;

    if (!menuIsOpen) return null;

    // TODO: Internal Option Type here
    const render = props => {
      // for performance, the menu options in state aren't changed when the
      // focused option changes so we calculate additional props based on that
      const isFocused = focusedOption === props.data;
      props.innerRef = isFocused ? this.getFocusedOptionRef : undefined;

      return (
        <Option {...commonProps} {...props} isFocused={isFocused}>
          {this.formatOptionLabel(props.data, 'menu')}
        </Option>
      );
    };

    let menuUI;

    if (this.hasOptions()) {
      menuUI = menuOptions.render.map(item => {
        if (item.type === 'group') {
          const { type, ...group } = item;
          const headingId = `${item.key}-heading`;

          return (
            <Group
              {...commonProps}
              {...group}
              Heading={GroupHeading}
              headingProps={{
                id: headingId,
                data: item.data,
              }}
              label={this.formatGroupLabel(item.data)}
            >
              {item.options.map(option => render(option))}
            </Group>
          );
        } else if (item.type === 'option') {
          return render(item);
        }
      });
    } else if (isLoading) {
      const message = loadingMessage({ inputValue });
      if (message === null) return null;
      menuUI = <LoadingMessage {...commonProps}>{message}</LoadingMessage>;
    } else {
      const message = noOptionsMessage({ inputValue });
      if (message === null) return null;
      menuUI = <NoOptionsMessage {...commonProps}>{message}</NoOptionsMessage>;
    }
    const menuPlacementProps = {
      minMenuHeight,
      maxMenuHeight,
      menuPlacement,
      menuPosition,
      menuShouldScrollIntoView,
    };

    const menuElement = (
      <MenuPlacer {...commonProps} {...menuPlacementProps}>
        {({ ref, placerProps: { placement, maxHeight } }) => (
          <Menu
            {...commonProps}
            {...menuPlacementProps}
            innerRef={ref}
            innerProps={{
              onMouseDown: this.onMenuMouseDown,
              onMouseMove: this.onMenuMouseMove,
            }}
            isLoading={isLoading}
            placement={placement}
          >
            <ScrollCaptor
              isEnabled={captureMenuScroll}
              onTopArrive={onMenuScrollToTop}
              onBottomArrive={onMenuScrollToBottom}
            >
              <ScrollBlock isEnabled={menuShouldBlockScroll}>
                <MenuList
                  {...commonProps}
                  innerRef={this.getMenuListRef}
                  isLoading={isLoading}
                  maxHeight={maxHeight}
                >
                  {menuUI}
                </MenuList>
              </ScrollBlock>
            </ScrollCaptor>
          </Menu>
        )}
      </MenuPlacer>
    );

    // positioning behaviour is almost identical for portalled and fixed,
    // so we use the same component. the actual portalling logic is forked
    // within the component based on `menuPosition`
    return menuPortalTarget || menuPosition === 'fixed' ? (
      <MenuPortal
        {...commonProps}
        appendTo={menuPortalTarget}
        controlElement={this.controlRef}
        menuPlacement={menuPlacement}
        menuPosition={menuPosition}
      >
        {menuElement}
      </MenuPortal>
    ) : (
      menuElement
    );
  }
  renderFormField() {
    const { delimiter, isDisabled, isMulti, name } = this.props;
    const { selectValue } = this.state;

    if (!name || isDisabled) return;

    if (isMulti) {
      if (delimiter) {
        const value = selectValue
          .map(opt => this.getOptionValue(opt))
          .join(delimiter);
        return <input name={name} type="hidden" value={value} />;
      } else {
        const input =
          selectValue.length > 0 ? (
            selectValue.map((opt, i) => (
              <input
                key={`i-${i}`}
                name={name}
                type="hidden"
                value={this.getOptionValue(opt)}
              />
            ))
          ) : (
            <input name={name} type="hidden" />
          );

        return <div>{input}</div>;
      }
    } else {
      const value = selectValue[0] ? this.getOptionValue(selectValue[0]) : '';
      return <input name={name} type="hidden" value={value} />;
    }
  }

  renderLiveRegion() {
    if (!this.state.isFocused) return null;
    return (
      <A11yText aria-live="polite">
        <span id="aria-selection-event">
          &nbsp;{this.state.ariaLiveSelection}
        </span>
        <span id="aria-context">&nbsp;{this.constructAriaLiveMessage()}</span>
      </A11yText>
    );
  }

  render() {
    const {
      Control,
      IndicatorsContainer,
      SelectContainer,
      ValueContainer,
    } = this.components;

    const { className, id, isDisabled, menuIsOpen } = this.props;
    const { isFocused } = this.state;
    const commonProps = (this.commonProps = this.getCommonProps());

    return (
      <SelectContainer
        {...commonProps}
        className={className}
        innerProps={{
          id: id,
          onKeyDown: this.onKeyDown,
        }}
        isDisabled={isDisabled}
        isFocused={isFocused}
      >
        {this.renderLiveRegion()}
        <Control
          {...commonProps}
          innerRef={this.getControlRef}
          innerProps={{
            onMouseDown: this.onControlMouseDown,
            onTouchEnd: this.onControlTouchEnd,
          }}
          isDisabled={isDisabled}
          isFocused={isFocused}
          menuIsOpen={menuIsOpen}
        >
          <ValueContainer {...commonProps} isDisabled={isDisabled}>
            {this.renderPlaceholderOrValue()}
            {this.renderInput()}
          </ValueContainer>
          <IndicatorsContainer {...commonProps} isDisabled={isDisabled}>
            {this.renderClearIndicator()}
            {this.renderLoadingIndicator()}
            {this.renderIndicatorSeparator()}
            {this.renderDropdownIndicator()}
          </IndicatorsContainer>
        </Control>
        {this.renderMenu()}
        {this.renderFormField()}
      </SelectContainer>
    );
  }
}

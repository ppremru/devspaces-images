/*
 * Copyright (c) 2018-2024 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import {
  AlertVariant,
  Button,
  ButtonVariant,
  Checkbox,
  Modal,
  ModalVariant,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { inject } from 'inversify';
import React from 'react';
import { connect, ConnectedProps } from 'react-redux';

import { AppAlerts } from '@/services/alerts/appAlerts';
import { AppState } from '@/store';
import { workspacePreferencesActionCreators } from '@/store/Workspaces/Preferences';
import {
  selectPreferencesIsTrustedSource,
  selectPreferencesTrustedSources,
} from '@/store/Workspaces/Preferences/selectors';

export type Props = MappedProps & {
  location: string;
  isOpen: boolean;
  onClose?: () => void;
  onContinue: () => void;
};
export type State = {
  continueDisabled: boolean;
  isTrusted: boolean;
  trustAllCheckbox: boolean;
};

class UntrustedSourceModal extends React.Component<Props, State> {
  @inject(AppAlerts)
  private readonly appAlerts: AppAlerts;

  constructor(props: Props) {
    super(props);

    this.state = {
      continueDisabled: false,
      isTrusted: this.props.isTrusted(props.location),
      trustAllCheckbox: false,
    };
  }

  public shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<State>): boolean {
    const isTrusted = this.props.isTrusted(this.props.location);
    const nextIsTrusted = nextProps.isTrusted(nextProps.location);
    if (isTrusted !== nextIsTrusted || this.state.isTrusted !== nextState.isTrusted) {
      return true;
    }

    if (this.state.continueDisabled !== nextState.continueDisabled) {
      return true;
    }

    if (this.props.isOpen !== nextProps.isOpen) {
      return true;
    }

    if (this.props.location !== nextProps.location) {
      return true;
    }

    if (this.state.trustAllCheckbox !== nextState.trustAllCheckbox) {
      return true;
    }

    return false;
  }

  public componentDidMount(): void {
    this.init();
  }

  public componentDidUpdate(): void {
    this.init();
  }

  private init() {
    const isTrusted = this.props.isTrusted(this.props.location);
    if (this.props.isOpen && isTrusted) {
      this.setState({
        continueDisabled: false,
        isTrusted,
        trustAllCheckbox: false,
      });

      this.props.onContinue();
    } else {
      this.setState({
        isTrusted,
      });
    }
  }

  private handleTrustAllToggle(checked: boolean): void {
    this.setState({ trustAllCheckbox: checked });
  }

  private handleClose(): void {
    this.setState({
      continueDisabled: false,
      trustAllCheckbox: false,
    });

    this.props.onClose?.();
  }

  private async handleContinue(): Promise<void> {
    try {
      this.setState({ continueDisabled: true });

      await this.updateTrustedSources();

      this.props.onContinue();
    } catch (e) {
      this.appAlerts.showAlert({
        key: 'update-trusted-sources',
        title: 'Failed to update trusted sources',
        variant: AlertVariant.danger,
      });
    }

    this.setState({ continueDisabled: false, trustAllCheckbox: false });
    this.props.onClose?.();
  }

  private async updateTrustedSources(): Promise<void> {
    const { location, trustedSources } = this.props;
    const { trustAllCheckbox } = this.state;

    if (trustedSources === '*') {
      return;
    } else if (trustAllCheckbox) {
      await this.props.addTrustedSource('*');
    } else {
      await this.props.addTrustedSource(location);
    }
  }

  private buildModalFooter(): React.ReactNode {
    const { continueDisabled } = this.state;

    return (
      <React.Fragment>
        <Button
          key="continue"
          variant={ButtonVariant.primary}
          onClick={() => this.handleContinue()}
          isDisabled={continueDisabled}
        >
          Continue
        </Button>
        <Button key="cancel" variant={ButtonVariant.link} onClick={() => this.handleClose()}>
          Cancel
        </Button>
      </React.Fragment>
    );
  }

  private buildModalBody(): React.ReactNode {
    const { trustAllCheckbox: isChecked } = this.state;
    return (
      <TextContent>
        <Text>
          Click <b>Continue</b> to proceed creating a new workspace from this source.
        </Text>
        <Checkbox
          id="trust-all-repos-checkbox"
          isChecked={isChecked}
          label="Do not ask me again for other repositories"
          onChange={(checked: boolean) => {
            this.handleTrustAllToggle(checked);
          }}
        />
      </TextContent>
    );
  }

  render(): React.ReactNode {
    const { isOpen } = this.props;
    const { isTrusted } = this.state;

    if (isTrusted) {
      return null;
    }

    const title = 'Do you trust the authors of this repository?';
    const footer = this.buildModalFooter();
    const body = this.buildModalBody();

    return (
      <Modal
        footer={footer}
        isOpen={isOpen}
        title={title}
        titleIconVariant="warning"
        variant={ModalVariant.medium}
        onClose={() => this.handleClose()}
      >
        {body}
      </Modal>
    );
  }
}

const mapStateToProps = (state: AppState) => ({
  trustedSources: selectPreferencesTrustedSources(state),
  isTrusted: selectPreferencesIsTrustedSource(state),
});

const connector = connect(mapStateToProps, workspacePreferencesActionCreators, null, {
  // forwardRef is mandatory for using `@react-mock/state` in unit tests
  forwardRef: true,
});

type MappedProps = ConnectedProps<typeof connector>;
export default connector(UntrustedSourceModal);

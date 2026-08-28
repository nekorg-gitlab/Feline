import React, { useState } from 'react';
import { Box, Button, Icon, Icons, Scroll, Text, toRem } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import FelineSVG from '../../../../../public/res/svg/feline.svg';

type SupportProps = {
  requestClose?: () => void;
};

export function Support({ requestClose }: SupportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('felipefmavelar@gmail.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = 'mailto:felipefmavelar@gmail.com';
    }
  };

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Icon src={Icons.Heart} size="100" filled />
            <Text size="H3" truncate>
              Support
            </Text>
          </Box>
          {requestClose && (
            <Box shrink="No">
              <Button onClick={requestClose} variant="Surface" size="300" radii="300" aria-label="Close">
                <Icon src={Icons.Cross} size="100" />
              </Button>
            </Box>
          )}
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <Box gap="400">
                <Box shrink="No">
                  <img
                    style={{ width: toRem(60), height: toRem(60) }}
                    src={FelineSVG}
                    alt="Feline logo"
                  />
                </Box>
                <Box direction="Column" gap="300">
                  <Box direction="Column" gap="100">
                    <Box gap="100" alignItems="End">
                      <Text size="H3">Support Feline</Text>
                      <Text size="T200">v4.12.6</Text>
                    </Box>
                    <Text size="T300" priority="300">
                      Feline is free and open-source. Your support keeps it running.
                    </Text>
                  </Box>
                </Box>
              </Box>

              <Box direction="Column" gap="100">
                <Text size="L400">Donate</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <Box direction="Column" gap="200">
                    <Box gap="200" alignItems="Center">
                      <Icon src={Icons.Heart} size="100" filled />
                      <Text size="H6">PayPal</Text>
                    </Box>
                    <Text size="T300" priority="300" style={{ wordBreak: 'break-all' }}>
                      felipefmavelar@gmail.com
                    </Text>
                    <Text size="T200" priority="300">
                      Direct PayPal transfer — open PayPal and send to this email, or use the button below.
                    </Text>
                  </Box>
                  <Box gap="200" wrap="Wrap">
                    <Button
                      as="a"
                      href="https://www.paypal.com/paypalme/felipefmavelar"
                      target="_blank"
                      rel="noreferrer noopener"
                      variant="Secondary"
                      fill="Soft"
                      size="300"
                      radii="300"
                      before={<Icon src={Icons.Heart} size="100" filled />}
                    >
                      <Text size="B300">Open PayPal</Text>
                    </Button>
                    <Button
                      onClick={handleCopyEmail}
                      variant="Secondary"
                      fill="Soft"
                      size="300"
                      radii="300"
                      outlined
                      before={<Icon src={Icons.Mail} size="100" />}
                    >
                      <Text size="B300">{copied ? 'Copied!' : 'Copy Email'}</Text>
                    </Button>
                    <Button
                      as="a"
                      href="mailto:felipefmavelar@gmail.com?subject=Support%20Feline"
                      variant="Secondary"
                      fill="Soft"
                      size="300"
                      radii="300"
                      outlined
                      before={<Icon src={Icons.Mail} size="100" />}
                    >
                      <Text size="B300">Email</Text>
                    </Button>
                  </Box>
                </SequenceCard>
              </Box>

              <Box direction="Column" gap="100">
                <Text size="T400" priority="300">
                  More options coming soon. For now PayPal is the only supported method. Questions?{' '}
                  <a href="mailto:felipefmavelar@gmail.com">felipefmavelar@gmail.com</a>
                </Text>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}

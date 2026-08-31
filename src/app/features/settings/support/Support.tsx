import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Icon, Icons, Scroll, Text, toRem } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import FelineSVG from '../../../../../public/res/svg/feline.svg';
import { VERSION_DISPLAY } from '../../../../version';

type SupportProps = {
  requestClose?: () => void;
};

export function Support({ requestClose }: SupportProps) {
  const { t } = useTranslation();
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
              {t('Common.support')}
            </Text>
          </Box>
          {requestClose && (
            <Box shrink="No">
              <Button
                onClick={requestClose}
                variant="Secondary"
                size="300"
                radii="300"
                aria-label={t('Common.close')}
              >
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
                      <Text size="H3">{t('Common.supportFeline')}</Text>
                      <Text size="T200">{VERSION_DISPLAY}</Text>
                    </Box>
                    <Text size="T300" priority="300">
                      {t('UI.felineIsFreeAndOpensourceYourSupportKeep')}
                    </Text>
                  </Box>
                </Box>
              </Box>

              <Box direction="Column" gap="100">
                <Text size="L400">{t('Common.donate')}</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <Box direction="Column" gap="200">
                    <Box gap="200" alignItems="Center">
                      <Icon src={Icons.Heart} size="100" filled />
                      <Text size="H6">{t('Common.paypal')}</Text>
                    </Box>
                    <Text size="T300" priority="300" style={{ wordBreak: 'break-all' }}>
                      felipefmavelar@gmail.com
                    </Text>
                    <Text size="T200" priority="300">
                      {t('UI.directPaypalTransferOpenPaypalAndSendToT')}
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
                      <Text size="B300">{t('Common.openPaypal')}</Text>
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
                      <Text size="B300">
                        {copied ? `${t('Common.copied')}!` : t('UI.auto_CopyEmail')}
                      </Text>
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
                      <Text size="B300">{t('Common.email')}</Text>
                    </Button>
                  </Box>
                </SequenceCard>
              </Box>

              <Box direction="Column" gap="100">
                <Text size="T400" priority="300">
                  {t('UI.auto_MoreOptionsComingSoo')} {t('Common.questions')}?{' '}
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

import React, { useState } from 'react';
import { Box, Button, Icon, Icons, Scroll, Text, color, config, toRem } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';

type SupportProps = {
  requestClose?: () => void;
};

type DonateOption = {
  title: string;
  description: string;
  actionLabel: string;
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  variant?: 'Primary' | 'Secondary' | 'Success' | 'Critical';
};

export function Support({ requestClose }: SupportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('felipefmavelar@gmail.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: open mailto
      window.location.href = 'mailto:felipefmavelar@gmail.com';
    }
  };

  const donateOptions: DonateOption[] = [
    {
      title: 'PayPal',
      description: 'felipefmavelar@gmail.com — fast, direct, no fees for friends & family. Recommended.',
      actionLabel: 'Donate via PayPal',
      href: 'https://www.paypal.com/paypalme/felipefmavelar',
      icon: <Icon src={Icons.Heart} size="100" filled />,
      variant: 'Primary',
    },
    {
      title: 'PayPal — Email Direct',
      description: 'Send directly to the PayPal address: felipefmavelar@gmail.com (use Send Money in your PayPal app).',
      actionLabel: copied ? 'Copied!' : 'Copy Email',
      onClick: handleCopyEmail,
      icon: <Icon src={Icons.Mail} size="100" />,
      variant: 'Secondary',
    },
    {
      title: 'GitHub Sponsors',
      description: 'Sponsor via GitHub — monthly or one-time. Supports open-source work.',
      actionLabel: 'View GitHub Sponsors',
      href: 'https://github.com/sponsors/nekorg',
      icon: <Icon src={Icons.Code} size="100" />,
      variant: 'Secondary',
    },
    {
      title: 'Buy Me a Coffee / Ko-fi',
      description: 'One-time coffee donations. Simple and fast.',
      actionLabel: 'Buy a Coffee',
      href: 'https://ko-fi.com/feline',
      icon: <Icon src={Icons.Smile} size="100" />,
      variant: 'Secondary',
    },
    {
      title: 'Bitcoin (BTC)',
      description: 'On-chain donations. Contact via email for address.',
      actionLabel: 'Contact for Address',
      href: 'mailto:felipefmavelar@gmail.com?subject=Bitcoin%20Donation%20Address',
      icon: <Icon src={Icons.BlockCode} size="100" />,
      variant: 'Secondary',
    },
    {
      title: 'Open Collective / Bank Transfer',
      description: 'For larger donations orองค์กร support. Reach out via email.',
      actionLabel: 'Contact via Email',
      href: 'mailto:felipefmavelar@gmail.com?subject=Donation%20Inquiry',
      icon: <Icon src={Icons.UserPlus} size="100" />,
      variant: 'Secondary',
    },
  ];

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Box style={{ width: toRem(24), height: toRem(24), background: color.Critical.Main, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon src={Icons.Heart} size="100" filled style={{ color: 'white' }} />
            </Box>
            <Text size="H3" truncate>
              Support Feline
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
            <Box direction="Column" gap="600">
              <Box direction="Column" gap="300">
                <Text size="H4">Donate — keep Feline alive</Text>
                <Text size="T300" priority="300">
                  Feline is free and open-source. Your donations fund hosting, development, and the
                  nekrord ecosystem. Choose any method below — every contribution helps.
                </Text>
                <Box
                  style={{
                    padding: `${config.space.S200} ${config.space.S300}`,
                    background: color.Critical.Container,
                    borderRadius: config.radii.R300,
                    border: `1px solid ${color.Critical.Main}`,
                  }}
                >
                  <Text size="T200" priority="300">
                    <b>PayPal is the fastest way to support:</b> felipefmavelar@gmail.com
                  </Text>
                </Box>
              </Box>

              <Box direction="Column" gap="400">
                <Text size="L400">Donate Options</Text>
                {donateOptions.map((opt, idx) => (
                  <SequenceCard
                    key={opt.title + idx}
                    className={SequenceCardStyle}
                    variant={idx === 0 ? 'Surface' : 'SurfaceVariant'}
                    direction="Column"
                    gap="300"
                    style={
                      idx === 0
                        ? { border: `1px solid ${color.Critical.Main}`, background: color.Surface.Container }
                        : undefined
                    }
                  >
                    <Box direction="Column" gap="200">
                      <Box gap="200" alignItems="Center">
                        {opt.icon}
                        <Text size="H6">{opt.title}</Text>
                        {idx === 0 && (
                          <Box
                            style={{
                              padding: `0 ${config.space.S100}`,
                              background: color.Critical.Main,
                              borderRadius: config.radii.R300,
                            }}
                          >
                            <Text size="L400" style={{ color: 'white' }}>
                              RECOMMENDED
                            </Text>
                          </Box>
                        )}
                      </Box>
                      <Text size="T300" priority="300">
                        {opt.description}
                      </Text>
                      {opt.title === 'PayPal' && (
                        <Text size="T200" priority="300" style={{ wordBreak: 'break-all' }}>
                          PayPal email: <b>felipefmavelar@gmail.com</b>
                        </Text>
                      )}
                    </Box>
                    <Box>
                      {opt.href ? (
                        <Button
                          as="a"
                          href={opt.href}
                          target="_blank"
                          rel="noreferrer noopener"
                          variant={idx === 0 ? 'Critical' : 'Secondary'}
                          fill={idx === 0 ? 'Solid' : 'Soft'}
                          size="300"
                          radii="300"
                          before={opt.icon}
                        >
                          <Text size="B300">{opt.actionLabel}</Text>
                        </Button>
                      ) : (
                        <Button
                          onClick={opt.onClick}
                          variant={opt.variant ?? 'Secondary'}
                          fill="Soft"
                          size="300"
                          radii="300"
                          before={opt.icon}
                        >
                          <Text size="B300">{opt.actionLabel}</Text>
                        </Button>
                      )}
                    </Box>
                  </SequenceCard>
                ))}
              </Box>

              <SequenceCard
                className={SequenceCardStyle}
                variant="SurfaceVariant"
                direction="Column"
                gap="300"
              >
                <Text size="L400">Why donate?</Text>
                <Box as="ul" direction="Column" gap="200" style={{ margin: 0, paddingLeft: config.space.S400 }}>
                  <li>
                    <Text size="T300">Keeps servers and CI running (docker, builds, hosting on 80/443)</Text>
                  </li>
                  <li>
                    <Text size="T300">Funds UI work — nekrord cat logo, themes, and mobile improvements</Text>
                  </li>
                  <li>
                    <Text size="T300">Supports E2EE, Matrix SDK updates, and open-source sustainability</Text>
                  </li>
                </Box>
                <Text size="T200" priority="300">
                  Questions? Email{' '}
                  <a href="mailto:felipefmavelar@gmail.com">felipefmavelar@gmail.com</a>
                </Text>
              </SequenceCard>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}

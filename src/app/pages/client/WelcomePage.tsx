import React, { useState } from 'react';
import { Box, Button, Icon, Icons, Text, config, toRem } from 'folds';
import { Page, PageHero, PageHeroSection } from '../../components/page';
import FelineSVG from '../../../../public/res/svg/feline.svg';
import { Modal500 } from '../../components/Modal500';
import { Support } from '../../features/settings/support';

export function WelcomePage() {
  const [supportOpen, setSupportOpen] = useState(false);
  return (
    <Page>
      <Box
        grow="Yes"
        style={{ padding: config.space.S400, paddingBottom: config.space.S700 }}
        alignItems="Center"
        justifyContent="Center"
      >
        <PageHeroSection>
          <PageHero
            icon={<img width="70" height="70" src={FelineSVG} alt="Feline Logo" />}
            title="Welcome to Feline"
            subTitle="The best matrix client ever."
          >
            <Box justifyContent="Center">
              <Box grow="Yes" style={{ maxWidth: toRem(300) }} direction="Column" gap="300">
                <Button
                  as="a"
                  href="https://gitlab.com/nekorg/feline"
                  target="_blank"
                  rel="noreferrer noopener"
                  before={<Icon size="200" src={Icons.Code} />}
                >
                  <Text as="span" size="B400" truncate>
                    Source Code
                  </Text>
                </Button>
                <Button
                  onClick={() => setSupportOpen(true)}
                  fill="Soft"
                  before={<Icon size="200" src={Icons.Heart} />}
                >
                  <Text as="span" size="B400" truncate>
                    Support
                  </Text>
                </Button>
              </Box>
            </Box>
          </PageHero>
        </PageHeroSection>
      </Box>
      <Modal500 open={supportOpen} requestClose={() => setSupportOpen(false)}>
        <Support requestClose={() => setSupportOpen(false)} />
      </Modal500>
    </Page>
  );
}

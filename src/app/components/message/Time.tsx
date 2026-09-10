import React, { ComponentProps } from 'react';
import { Text, as } from 'folds';
import { timeDayMonYear, timeHourMinute, today, yesterday } from '../../utils/time';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

export type TimeProps = {
  compact?: boolean;
  ts: number;
  hour24Clock: boolean;
  dateFormatString: string;
};

export const Time = as<'span', TimeProps & ComponentProps<typeof Text>>(
  ({ compact, hour24Clock, dateFormatString, ts, ...props }, ref) => {
    const isMobile = useScreenSizeContext() === ScreenSize.Mobile;
    const formattedTime = timeHourMinute(ts, hour24Clock);
    // Narrow screens show only the clock; the full date stays in the tooltip.
    const longTime = yesterday(ts)
      ? `Yesterday ${formattedTime}`
      : `${timeDayMonYear(ts, dateFormatString)} ${formattedTime}`;
    const mobileShort = isMobile && !compact;
    const time = compact || mobileShort || today(ts) ? formattedTime : longTime;

    return (
      <Text
        as="time"
        style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
        size="T200"
        priority="300"
        title={mobileShort ? longTime : undefined}
        {...props}
        ref={ref}
      >
        {time}
      </Text>
    );
  },
);

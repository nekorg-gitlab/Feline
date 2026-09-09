import React, { ComponentProps } from 'react';
import { Text, as } from 'folds';
import { timeDayMonYear, timeHourMinute, today, yesterday } from '../../utils/time';

export type TimeProps = {
  compact?: boolean;
  ts: number;
  hour24Clock: boolean;
  dateFormatString: string;
};

export const Time = as<'span', TimeProps & ComponentProps<typeof Text>>(
  ({ compact, hour24Clock, dateFormatString, ts, ...props }, ref) => {
    const formattedTime = timeHourMinute(ts, hour24Clock);
    const time =
      compact || today(ts)
        ? formattedTime
        : yesterday(ts)
          ? `Yesterday ${formattedTime}`
          : `${timeDayMonYear(ts, dateFormatString)} ${formattedTime}`;

    return (
      <Text as="time" style={{ flexShrink: 0 }} size="T200" priority="300" {...props} ref={ref}>
        {time}
      </Text>
    );
  },
);

import * as vscode from 'vscode';
import * as dayjs from 'dayjs';
import * as utcPlugin from 'dayjs/plugin/utc';
import * as timezonePlugin from 'dayjs/plugin/timezone';

dayjs.extend(utcPlugin);
dayjs.extend(timezonePlugin);

class DateHoverProvider implements vscode.HoverProvider, vscode.Disposable {

  private dateRegexp = {
    iso8601: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|(\+|\-)\d{2}:\d{2})/,
    epoch: /\d{9,14}/
  };

  get detectIso8601Enabled(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>('date-preview.detect.ISO-8601String', true);
  }

  get detectEpochEnabled(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>('date-preview.detect.epochTimestamp', true);
  }
  
  get primaryPreviewEnabled(): boolean {
    return vscode.workspace.getConfiguration().get<boolean>('date-preview.primaryPreview.enable', true);
  }

  get primaryPreviewName(): string {
    return vscode.workspace.getConfiguration().get<string>('date-preview.primaryPreview.name', 'Local');
  }

  get primaryPreviewFormat(): string {
    return vscode.workspace.getConfiguration().get<string>('date-preview.primaryPreview.format', '');
  }
  
  get primaryPreviewUtcOffset(): number | undefined {
    return vscode.workspace.getConfiguration().get<number>('date-preview.primaryPreview.utcOffset');
  }

  get primaryPreviewTimezone(): string | undefined{
    return vscode.workspace.getConfiguration().get<string>('date-preview.primaryPreview.timezone');
  }

  get additionalPreivews(): Array<PreviewConfig> {
    return vscode.workspace.getConfiguration().get<Array<PreviewConfig>>('date-preview.additionalPreviews', []);
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    let date: any = undefined;
    let msg = '';

    if (this.detectIso8601Enabled) {
      const isoRange = document.getWordRangeAtPosition(position, this.dateRegexp.iso8601);

      if (isoRange) {
        const hoveredWord = document.getText(isoRange);
        date = dayjs(hoveredWord);
      }
    }

    if (this.detectEpochEnabled) {
      const epochRange = document.getWordRangeAtPosition(position, this.dateRegexp.epoch);

      if (epochRange) {
        let hoveredWord = document.getText(epochRange);
        // convert seconds to milliseconds
        if (hoveredWord.length <= 10) {
          hoveredWord += '000';
        }

        date = dayjs(+hoveredWord);
      }
    }

    if (date !== undefined && (date as dayjs.Dayjs).isValid()) {
      msg = this.buildPreviewMessage(date);
    }

    return msg ? new vscode.Hover(msg) : undefined;
  }

  buildPreviewMessage(date: dayjs.Dayjs): string {
    let message = '';
    const previewConfigs = [...this.additionalPreivews];

    if (this.primaryPreviewEnabled) {
      const primaryPriviewConfig = {
        name: this.primaryPreviewName,
        format: this.primaryPreviewFormat,
        utcOffset: this.primaryPreviewUtcOffset,
        timezone: this.primaryPreviewTimezone
      };
      previewConfigs.unshift(primaryPriviewConfig);
    }

    for (const item of previewConfigs) {
      if (!item.name) {
        continue;
      }

      let dateObj: dayjs.Dayjs;
      if(item.timezone) {
        dateObj = date.tz(item.timezone);
      } else if(item.utcOffset) {
        dateObj = date.utcOffset(item.utcOffset);
      } else {
        dateObj = date.tz(dayjs.tz.guess());
      }

      const dateStr = `${item.format ? dateObj.format(item.format) : dateObj.format()}`;
      message += this.buildSinglePreviewItem(item.name, dateObj.format('Z'), dateStr);
    }

    return message;
  }

  buildSinglePreviewItem(name: string, utcOffsetStr: string, dateString: string): string {
    return `\n\n*${name} (${utcOffsetStr})*  \n${dateString}`;
  }
  
  dispose() {
    // nothing to do
  }
}

export default DateHoverProvider;
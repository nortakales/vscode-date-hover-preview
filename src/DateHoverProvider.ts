import * as vscode from 'vscode';
import * as dayjs from 'dayjs';
import * as utcPlugin from 'dayjs/plugin/utc';
import * as timezonePlugin from 'dayjs/plugin/timezone';
import * as advancedFormat from 'dayjs/plugin/advancedFormat';


dayjs.extend(utcPlugin);
dayjs.extend(timezonePlugin);
dayjs.extend(advancedFormat);

class DateHoverProvider implements vscode.HoverProvider {

    private logger = vscode.window.createOutputChannel("DateHoverPreview");

    public constructor() {
        this.log("DateHoverProvider activated")
    }

    private dateRegex = {
        iso8601: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(Z|(\+|\-)\d{2}:\d{2})/,
        epoch: /\d{9,14}/
    };

    get detectIso8601Enabled(): boolean {
        return vscode.workspace.getConfiguration().get<boolean>('date-hover-preview.detect.ISO-8601String', true);
    }

    get detectEpochEnabled(): boolean {
        return vscode.workspace.getConfiguration().get<boolean>('date-hover-preview.detect.epochTimestamp', true);
    }
    
    get primaryPreviewEnabled(): boolean {
        return vscode.workspace.getConfiguration().get<boolean>('date-hover-preview.primaryPreview.enable', true);
    }

    get primaryPreviewName(): string {
        return vscode.workspace.getConfiguration().get<string>('date-hover-preview.primaryPreview.name', 'Local');
    }

    get primaryPreviewFormat(): string {
        return vscode.workspace.getConfiguration().get<string>('date-hover-preview.primaryPreview.format', '');
    }
    
    get primaryPreviewUtcOffset(): number | undefined {
        return vscode.workspace.getConfiguration().get('date-hover-preview.primaryPreview.utcOffset');
    }

    get primaryPreviewTimezone(): string | undefined {
        return vscode.workspace.getConfiguration().get<string>('date-hover-preview.primaryPreview.timezone');
    }

    get additionalPreivews(): Array<PreviewConfig> {
        return vscode.workspace.getConfiguration().get<Array<PreviewConfig>>('date-hover-preview.additionalPreviews', []);
    }

    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        
      let date: any = undefined;

        if (this.detectIso8601Enabled) {
            const isoRange = document.getWordRangeAtPosition(position, this.dateRegex.iso8601);

            if (isoRange) {
                const hoveredWord = document.getText(isoRange);
                date = dayjs(hoveredWord);
            }
        }

        if (this.detectEpochEnabled) {
            const epochRange = document.getWordRangeAtPosition(position, this.dateRegex.epoch);

            if (epochRange) {
                let hoveredWord = document.getText(epochRange);
                // convert seconds to milliseconds
                if (hoveredWord.length <= 10) {
                    hoveredWord += '000';
                }

                date = dayjs(+hoveredWord);
            }
        }

        let previewMessage = '';
        if (date !== undefined && (date as dayjs.Dayjs).isValid()) {
            this.log("Detected date, providing hover preview");
            previewMessage = this.buildPreviewMessage(date);
        }

        return previewMessage ? new vscode.Hover(previewMessage) : undefined;
    }

    private buildPreviewMessage(date: dayjs.Dayjs): string {
        
        const previewConfigs = [...this.additionalPreivews];

        if (this.primaryPreviewEnabled) {
            const primaryPreviewConfig = {
                name: this.primaryPreviewName,
                format: this.primaryPreviewFormat,
                utcOffset: this.primaryPreviewUtcOffset,
                timezone: this.primaryPreviewTimezone
            };
            previewConfigs.unshift(primaryPreviewConfig);
        }

        let previewMessage = '';

        for (const item of previewConfigs) {

            if (!item.name) {
                continue;
            }
            
            let dateInTimezone: dayjs.Dayjs;
            if(item.timezone) {
                dateInTimezone = date.tz(item.timezone);
            } else if(item.utcOffset != undefined) {
                dateInTimezone = date.utcOffset(item.utcOffset);
            } else {
                dateInTimezone = date.tz(dayjs.tz.guess());
            }

            const formattedDate = `${item.format ? dateInTimezone.format(item.format) : dateInTimezone.format()}`;
            previewMessage += this.buildSinglePreviewItem(item.name, dateInTimezone.format('Z'), formattedDate);
        }

        return previewMessage;
    }

    private buildSinglePreviewItem(name: string, utcOffsetStr: string, dateString: string): string {
        return `\n\n*${name} (${utcOffsetStr})*    \n${dateString}`;
    }

    private log(string: string) {
        this.logger.appendLine(string);
    }
}

export default DateHoverProvider;
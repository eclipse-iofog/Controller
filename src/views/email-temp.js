/*
 * *******************************************************************************
 *  * Copyright (c) 2018 Edgeworx, Inc.
 *  *
 *  * This program and the accompanying materials are made available under the
 *  * terms of the Eclipse Public License v. 2.0 which is available at
 *  * http://www.eclipse.org/legal/epl-2.0
 *  *
 *  * SPDX-License-Identifier: EPL-2.0
 *  *******************************************************************************
 *
 */

let emailRecoveryTemplate = {
  p1: "<div>\
		<table bgcolor='#f6f6f6' style = 'width:100%'>\
		<tbody><tr>\
			<td></td>\
			<td width='600px'>\
				<div style = 'margin: 20px 0 0 0'>\
					<table cellspacing='0' style='border:1px solid #e9e9e9' bgcolor='#fff'>\
						<tbody>\
							<tr>\
								<td style='font-family: sans-serif; font-size:16px; vertical-align:top;color:#fff;text-align:center;background-color:#ff9f00; padding:20px' align='center'>\
									Hi, ",

  p2: "</td>\
							</tr>\
							<tr>\
								<td style = 'padding:20px 0 20px 0'>\
									<table>\
										<tbody>\
											<tr style = 'line-height:1.6em; font-family: sans-serif; font-size:14px;'>\
												<td style = 'padding:0 20px'>\
													We sent you this email just to tell you that your password was changed.\
													Did you do that? If so, then we are all good. If not, then please contact us\
													so we can help you avoid any potential problems.\
												</td>\
											</tr>\
											<tr>\
												<td style = 'padding:20px; font-family: sans-serif; font-size:14px;'>\
													You can just reply directly to this email if you need to contact us.\
												</td>\
											</tr>\
											<tr>\
												<td style ='font-family: sans-serif; font-size:14px; padding:0 20px'>\
													— the IOFOG team\
												</td>\
											</tr>\
										</tbody>\
									</table>\
								</td>\
							</tr>\
						</tbody>\
					</table>\
					<div>\
						<table width='100%'>\
							<tbody>\
								<tr>\
									<td style='font-family: sans-serif; font-size:12px; vertical-align:top;color:#999;text-align:center;padding:20px 0 20px'>\
										Follow <a style = 'color:#999;' href='https://twitter.com/EclipseioFog'>@EclipseioFog</a> on Twitter.\
									</td>\
								</tr>\
							</tbody>\
						</table>\
					</div>\
				</div>\
			</td>\
			<td></td>\
		</tr></tbody>\
	</table></div>"
}

module.exports = emailRecoveryTemplate;
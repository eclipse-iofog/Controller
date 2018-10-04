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

let emailResetTemplate = {
  p1: "<div>\
	<table bgcolor='#f6f6f6' style = 'width:100%'>\
		<tbody><tr>\
				<td></td>\
				<td width = '600px'>\
					<div style = 'margin: 20px 0 0 0'>\
						<table \
							cellspacing ='0' \
							style ='border:1px solid #e9e9e9' \
							bgcolor ='#fff'>\
							<tbody>\
								<tr>\
									<td \
										style = 'font-family: sans-serif; \
										font-size: 14px; \
										vertical-align: top; \
										padding: 20px 20px 0; width: 600px;'>\
										Hi ",

  p2: "</td>\
								</tr>\
								<tr>\
									<td style='padding: 0 0 20px 0;'>\
										<table>\
											<tbody>\
												<tr \
													style = 'line-height:1.6em; \
														font-family: sans-serif; \
														font-size:14px;'>\
													<td \
														style = 'padding: 10px 20px 0 20px;'>\
														It took like you were having some trouble with your password?\
													</td>\
												</tr>\
												<tr \
													style = 'line-height: 50px; \
														font-family: sans-serif; \
														font-size:14px;'>\
													<td \
														style = 'padding:0 20px'>\
														You can use the temporary password ",

  p3: " to log in.\
													</td>\
												</tr>\
												<tr>\
													<td \
														style = 'padding:0 20px 10px; \
														font-family: sans-serif; \
														font-size:14px;'>\
														<a href ='",

  p4: "/login' class = 'btn' style='\
															font-size: 16px;\
														    color: #fff;\
														    background: #348eda;\
														    border: none;\
														    padding: 10px 20px;\
														    border-radius: 6px;\
														    text-decoration: none; margin-left: 20px;'>\
															Go To Login\
														</a>\
													</td>\
												</tr>\
												<tr>\
													<td \
														style ='font-family: sans-serif; \
														font-size:14px; \
														padding:15px 20px'>\
														— the IOFOG team\
													</td>\
												</tr>\
												<tr></tr>\
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
										<td \
											style='font-family: sans-serif; \
											font-size:12px; \
											vertical-align:top;color:#999;\
											text-align:center;\
											padding:20px 0 20px'>\
											Follow \
											<a \
												style = 'color:#999;' \
												href='https://twitter.com/EclipseioFog'>\
												@EclipseioFog\
											</a> \
											on Twitter.\
										</td>\
									</tr>\
								</tbody>\
							</table>\
						</div>\
					</div>\
				</td>\
				<td>\
				</td>\
			</tr>\
		</tbody>\
	</table>\
</div>"
}

module.exports = emailResetTemplate;
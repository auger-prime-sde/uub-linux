/*
 * Led_Loop.c
 *  LEDs loop for linearity
 *  event_bunch == N. of events necessary to change the LEDs configuration
 *  Created on: 07/lug/2016
 *      Author: D. Martello, M.R. Coluccia
 */
#include <fcntl.h>
#include <stdio.h>
#include <linux/i2c-dev.h>
#include <unistd.h>
#include <sys/mman.h>
#include <stdlib.h>
extern  int dac_led1, dac_led2, dac_led3, dac_led4;
int set_led(int,int,int,int);
int led_loop(int event_bunch) {
/*  ...*/

    int Status;
	static int ledstatus=0,led1_old,led2_old,led_step1=0,led_step2=0,led_off=80;
    static int NP_linearity=0;
    static int my_evnt=0;


/*  */
		if (ledstatus==0) {
			ledstatus=1;
// Starting value for the LEDs. WARNING this value depend on the LEDs
//                              different LEDs need different value
//                              Has to be implemented a LED calibration procedure
			dac_led1=260;
			dac_led2=230;
			dac_led3=0;
			dac_led4=0;
			led1_old=260;
			led2_old=230;
// LEDs steps. WARNING need calibration!
			led_step1=14;
			led_step2=12;
        	Status = set_led(dac_led1,dac_led2,dac_led3,dac_led4);
        	if (Status != 0) {
        		printf("IIC Master non riceve risposta dal DAC\r\n");
        		return 1;
        	}
		}
		if (my_evnt>event_bunch){
			my_evnt=0;
			if (ledstatus==1){
            	ledstatus=2;
            	dac_led2=led2_old+led_step2;
			} else if (ledstatus==2) {
				ledstatus=3;
				led1_old=dac_led1;
				dac_led1=led_off;

			} else if (ledstatus==3) {
            	ledstatus=1;
            	led2_old=dac_led2;
            	dac_led2=led_off;
            	dac_led1=led1_old+led_step1;
            	NP_linearity++;
			}
        	Status = set_led(dac_led1,dac_led2,dac_led3,dac_led4);
        	if (Status != 0) {
        		printf("IIC Master non riceve risposta dal DAC\r\n");
        		return 1;
        	}

			printf("LED status %d\n",ledstatus);
		} else my_evnt++;
		if (NP_linearity>20) return 1;
  return 0;
}


